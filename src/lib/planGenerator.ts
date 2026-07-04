import * as turf from '@turf/turf';
import type { Feature, Polygon, MultiPolygon, Position, LineString } from 'geojson';
import type { DesignParams, GeneratedPlan, LatLng, LagunaConfig } from '../types';

type GeoPolygon     = Feature<Polygon>;
type GeoPolyOrMulti = Feature<Polygon | MultiPolygon>;
type XY = [number, number]; // [east-metres, north-metres]

// ── Local metric projection (equirectangular, corrected for latitude) ─────────
// At latitude φ: 1° lat = R metres, 1° lng = R·cos(φ) metres
const R = 111320;

function cosLat(lat: number) { return Math.cos(lat * Math.PI / 180); }

function toXY(p: LatLng, o: LatLng): XY {
  return [(p.lng - o.lng) * cosLat(o.lat) * R, (p.lat - o.lat) * R];
}

function fromXY([x, y]: XY, o: LatLng): LatLng {
  return { lat: o.lat + y / R, lng: o.lng + x / (cosLat(o.lat) * R) };
}

// ── 2-D geometry (all in metres) ──────────────────────────────────────────────

function rot2([x, y]: XY, a: number): XY {       // CCW by a radians
  const c = Math.cos(a), s = Math.sin(a);
  return [x * c - y * s, x * s + y * c];
}

function pip(pt: XY, ring: XY[]): boolean {       // point-in-polygon (ray cast)
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > pt[1]) !== (yj > pt[1]) &&
        pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

// Angle (radians, CCW from east) of the longest edge of an XY ring.
// Working in real metres means the angle is geometrically correct.
function dominantAngle(ring: XY[]): number {
  let maxLen = 0, angle = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const dx = ring[i + 1][0] - ring[i][0];
    const dy = ring[i + 1][1] - ring[i][1];
    const len = Math.hypot(dx, dy);
    if (len > maxLen) { maxLen = len; angle = Math.atan2(dy, dx); }
  }
  // Normalise to [0, π/2) — a grid repeats every 90°
  return ((angle % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2);
}

// ── GeoJSON helpers ───────────────────────────────────────────────────────────

function makeGeo(pts: LatLng[]): GeoPolygon {
  const pos = pts.map(c => [c.lng, c.lat] as Position);
  if (pos[0][0] !== pos[pos.length - 1][0] || pos[0][1] !== pos[pos.length - 1][1])
    pos.push(pos[0]);
  return turf.polygon([pos]) as GeoPolygon;
}

function bufferGeo(f: GeoPolyOrMulti, m: number): GeoPolyOrMulti {
  try {
    const r = turf.buffer(f, m, { units: 'meters' });
    if (r) return r as unknown as GeoPolyOrMulti;
  } catch { /* fall through */ }
  return f;
}

function intersectGeo(a: GeoPolygon, b: GeoPolyOrMulti): GeoPolyOrMulti | null {
  try {
    return turf.intersect(
      turf.featureCollection([a, b as GeoPolygon])
    ) as GeoPolyOrMulti | null;
  } catch { return null; }
}

function geoToLL(f: GeoPolyOrMulti): LatLng[][] {
  const toLL = (p: Position): LatLng => ({ lat: p[1], lng: p[0] });
  if (f.geometry.type === 'Polygon')
    return f.geometry.coordinates.map(r => (r as Position[]).map(toLL));
  const out: LatLng[][] = [];
  for (const poly of (f as Feature<MultiPolygon>).geometry.coordinates)
    for (const ring of poly) out.push((ring as Position[]).map(toLL));
  return out;
}

function outerRingXY(f: GeoPolyOrMulti, o: LatLng): XY[] {
  const ring = f.geometry.type === 'Polygon'
    ? (f as GeoPolygon).geometry.coordinates[0]
    : (f as Feature<MultiPolygon>).geometry.coordinates[0][0];
  return (ring as Position[]).map(p => toXY({ lat: p[1], lng: p[0] }, o));
}

function lagunaRing(cfg: LagunaConfig, lcx: number, lcy: number, radiusM: number): XY[] {
  const N = 64;
  const shape = cfg.shape ?? 'circle';

  if (shape === 'semicircle') {
    const orientationRad = ((cfg.orientationDeg ?? 0) * Math.PI) / 180;
    const startAngle = orientationRad - Math.PI / 2;
    const endAngle = orientationRad + Math.PI / 2;
    const ring: XY[] = Array.from({ length: N + 1 }, (_, i) => {
      const a = startAngle + ((endAngle - startAngle) * i) / N;
      return [lcx + radiusM * Math.cos(a), lcy + radiusM * Math.sin(a)] as XY;
    });
    ring.push(ring[0]);
    return ring;
  }

  return Array.from({ length: N + 1 }, (_, i) => {
    const a = (2 * Math.PI * i) / N;
    return [lcx + radiusM * Math.cos(a), lcy + radiusM * Math.sin(a)] as XY;
  });
}

// ── Plan generator ────────────────────────────────────────────────────────────

export function generatePlan(coords: LatLng[], params: DesignParams): GeneratedPlan {
  const plotGeo  = makeGeo(coords);
  const plotArea = turf.area(plotGeo);

  // Projection origin = centroid of plot
  const centTurf = turf.centroid(plotGeo);
  const origin: LatLng = {
    lat: centTurf.geometry.coordinates[1],
    lng: centTurf.geometry.coordinates[0],
  };

  // ── Erode with Turf (handles geodesy) ──
  const buildableGeo = bufferGeo(plotGeo as GeoPolyOrMulti, -params.setback);
  const innerGeo     = bufferGeo(buildableGeo, -params.boulevardWidth);

  // ── Convert inner ring to metric XY → find real-world dominant angle ──
  const innerXY    = outerRingXY(innerGeo, origin);
  const angle      = dominantAngle(innerXY);   // radians CCW

  // Rotate inner ring to be axis-aligned (rotate by -angle)
  const innerAligned = innerXY.map(p => rot2(p, -angle));
  const xs = innerAligned.map(p => p[0]);
  const ys = innerAligned.map(p => p[1]);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(...ys), yMax = Math.max(...ys);
  const W = xMax - xMin, H = yMax - yMin;

  const { secondaryRoadWidth: rdW,
          standardLotWidth:   stdW, standardLotDepth: stdD,
          largeLotWidth:      lgW,  largeLotDepth:    lgD,
          largeLotPercent } = params;

  // ── Amenity zones (in aligned metric space, un-rotated back for display) ──
  const amenityDefs = [
    { key: 'parqueCentral' as const, label: 'Parque Central',     color: '#3ecf6e', box: [0.35,0.38,0.30,0.28] },
    { key: 'clubhouse'     as const, label: 'SUM / Clubhouse',    color: '#9a7aff', box: [0.05,0.62,0.20,0.22] },
    { key: 'entrada'       as const, label: 'Entrada',            color: '#e8c84a', box: [0.38,0.02,0.24,0.12] },
    { key: 'parrillas'     as const, label: 'Parrillas',          color: '#ff8c4a', box: [0.05,0.08,0.18,0.18] },
    { key: 'canchas'       as const, label: 'Canchas Deportivas', color: '#4affb0', box: [0.65,0.08,0.28,0.20] },
  ] as const;

  const amenityZones: GeneratedPlan['amenityZones'] = [];
  const amenityRings: XY[][] = [];   // in aligned metric space, for fast PIP exclusion

  for (const def of amenityDefs) {
    if (!params.amenities[def.key]) continue;
    const [xF, yF, wF, hF] = def.box;
    const ax0 = xMin + xF * W, ay0 = yMin + yF * H;
    const ax1 = ax0 + wF * W,  ay1 = ay0 + hF * H;
    const ring: XY[] = [[ax0,ay0],[ax1,ay0],[ax1,ay1],[ax0,ay1],[ax0,ay0]];
    amenityRings.push(ring);
    const ll = ring.map(p => fromXY(rot2(p, angle), origin));
    amenityZones.push({ type: def.key, label: def.label, color: def.color, coords: [ll] });
  }

  // ── Laguna (circle or semicircle) ──
  if (params.amenities.laguna) {
    const cfg = params.lagunaConfig ?? { center: null, radiusM: 80, shape: 'circle', orientationDeg: 0 };
    const radiusM = Math.max(10, cfg.radiusM);

    // Determine center in aligned XY space
    let lcx: number, lcy: number;
    if (cfg.center) {
      const xy = toXY(cfg.center, origin);
      const al = rot2(xy, -angle);
      [lcx, lcy] = al;
    } else {
      // Default position: upper-right quadrant (matches original laguna box)
      lcx = xMin + 0.77 * W;
      lcy = yMin + 0.775 * H;
    }

    const lagunaRingXY = lagunaRing(cfg, lcx, lcy, radiusM);

    amenityRings.push(lagunaRingXY);

    // Convert to LatLng and clip to inner polygon
    const ll = lagunaRingXY.map(p => fromXY(rot2(p, angle), origin));
    const lagunaGeo = makeGeo(ll);
    const clipped = intersectGeo(lagunaGeo, innerGeo);
    amenityZones.push({
      type: 'laguna',
      label: 'Laguna',
      color: '#4a9eff',
      coords: clipped ? geoToLL(clipped) : [ll],
    });
  }

  // ── Road grid (generated in aligned metric space, clipped to inner polygon) ──
  const roads: GeneratedPlan['roads'] = [];

  function addBand(x0: number, y0: number, x1: number, y1: number, type: 'boulevard' | 'secondary') {
    // Band corners in aligned space → un-rotate → lat/lng → clip to innerGeo
    const ring: XY[] = [[x0,y0],[x1,y0],[x1,y1],[x0,y1],[x0,y0]];
    const ll = ring.map(p => fromXY(rot2(p, angle), origin));
    const geo = makeGeo(ll);
    const clipped = intersectGeo(geo, innerGeo);
    if (clipped) roads.push({ type, coords: geoToLL(clipped) });
  }

  // Horizontal roads — one at each row boundary
  for (let y = yMin; y < yMax; y += stdD + rdW) {
    addBand(xMin, y, xMax, y + rdW, 'secondary');
  }
  // Last horizontal road at yMax
  addBand(xMin, yMax - rdW, xMax, yMax, 'secondary');

  // Vertical roads — one at each column boundary
  for (let x = xMin; x < xMax; x += stdW + rdW) {
    addBand(x, yMin, x + rdW, yMax, 'secondary');
  }
  // Last vertical road at xMax
  addBand(xMax - rdW, yMin, xMax, yMax, 'secondary');

  // Boulevard ring (difference between buildable and inner)
  try {
    const blvd = turf.difference(turf.featureCollection([
      buildableGeo as GeoPolygon,
      innerGeo     as GeoPolygon,
    ]));
    if (blvd) roads.push({ type: 'boulevard', coords: geoToLL(blvd as GeoPolyOrMulti) });
  } catch { /* optional */ }

  // ── Lots ──
  const largeFrac = largeLotPercent / 100;
  let lotId = 0;
  const lots: GeneratedPlan['lots'] = [];

  // First lot row starts after the first horizontal road band
  let rowY = yMin + rdW;
  while (rowY + Math.min(stdD, lgD) * 0.5 < yMax - rdW) {
    const isLargeRow = Math.random() < largeFrac;
    const ld = isLargeRow ? lgD : stdD;

    let colX = xMin + rdW;
    while (colX + Math.min(stdW, lgW) * 0.5 < xMax - rdW) {
      const isLarge = Math.random() < largeFrac;
      const lw = isLarge ? lgW : stdW;

      const cx: XY = [colX + lw / 2, rowY + ld / 2];

      // Fast metric PIP checks (skip if outside inner area or inside amenity)
      if (!pip(cx, innerAligned))               { colX += lw + rdW; continue; }
      if (amenityRings.some(r => pip(cx, r)))   { colX += lw + rdW; continue; }

      // Build lot in aligned space, un-rotate, project to lat/lng
      const corners: XY[] = [
        [colX, rowY], [colX + lw, rowY],
        [colX + lw, rowY + ld], [colX, rowY + ld],
        [colX, rowY],
      ];
      const ll = corners.map(p => fromXY(rot2(p, angle), origin));
      const lotGeo = makeGeo(ll);

      // Clip to inner polygon so boundary lots never stick out
      const clipped = intersectGeo(lotGeo, innerGeo) ?? (lotGeo as GeoPolyOrMulti);

      lots.push({
        id: ++lotId, isLarge,
        area: isLarge ? lgW * lgD : stdW * stdD,
        coords: geoToLL(clipped),
      });

      colX += lw + rdW;
    }
    rowY += ld + rdW;
  }

  // ── Stats ──
  const roadArea  = roads.reduce((s, r) => {
    try { return s + turf.area(turf.polygon(r.coords.map(ring => ring.map(c => [c.lng, c.lat] as Position)))); }
    catch { return s; }
  }, 0);
  const lotArea   = lots.reduce((s, l) => s + l.area, 0);
  const greenArea = amenityRings.reduce((s, ring) => {
    // area of aligned rect
    const xs2 = ring.map(p => p[0]), ys2 = ring.map(p => p[1]);
    return s + (Math.max(...xs2) - Math.min(...xs2)) * (Math.max(...ys2) - Math.min(...ys2));
  }, 0);

  const perimLine = turf.polygonToLine(plotGeo);
  const perimeter = turf.length(perimLine as Feature<LineString>, { units: 'meters' });

  return {
    lots, roads, amenityZones,
    stats: {
      totalLots:           lots.length,
      totalArea:           plotArea / 10000,
      roadCoveragePercent: Math.round((roadArea / plotArea) * 100),
      greenSpacePercent:   Math.round((greenArea  / plotArea) * 100),
      avgLotSize:          lots.length ? Math.round(lotArea / lots.length) : 0,
      perimeter:           Math.round(perimeter),
      standardLots:        lots.filter(l => !l.isLarge).length,
      largeLots:           lots.filter(l =>  l.isLarge).length,
    },
  };
}

// ── Coordinate parser ─────────────────────────────────────────────────────────

export function parsePlotArea(coords: LatLng[]): { areaSqM: number; areaHa: number; perimeter: number } {
  if (coords.length < 3) return { areaSqM: 0, areaHa: 0, perimeter: 0 };
  const poly      = makeGeo(coords);
  const areaSqM   = turf.area(poly);
  const perimLine = turf.polygonToLine(poly);
  const perimeter = turf.length(perimLine as Feature<LineString>, { units: 'meters' });
  return { areaSqM, areaHa: areaSqM / 10000, perimeter };
}
