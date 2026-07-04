import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LatLng, GeneratedPlan } from '../types';

interface Props {
  coordinates: LatLng[];
  plan: GeneratedPlan | null;
  satellite: boolean;
  showLotNumbers: boolean;
  showDimensions: boolean;
  pickingLaguna: boolean;
  onPickLagunaCenter: (c: LatLng) => void;
}

const SATELLITE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const OSM_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

export default function MapView({ coordinates, plan, satellite, showLotNumbers, showDimensions, pickingLaguna, onPickLagunaCenter }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const layersRef = useRef<L.Layer[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [-34.4428, -58.9122],
      zoom: 14,
      zoomControl: true,
    });

    const tile = L.tileLayer(SATELLITE_URL, {
      attribution: 'Tiles &copy; Esri',
      maxZoom: 20,
    }).addTo(map);

    L.control.scale({ imperial: false }).addTo(map);

    mapRef.current = map;
    tileRef.current = tile;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Toggle satellite/OSM
  useEffect(() => {
    if (!mapRef.current || !tileRef.current) return;
    tileRef.current.setUrl(satellite ? SATELLITE_URL : OSM_URL);
  }, [satellite]);

  // Laguna pick mode
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const container = map.getContainer();
    container.style.cursor = pickingLaguna ? 'crosshair' : '';
    if (!pickingLaguna) return;
    function onClick(e: L.LeafletMouseEvent) {
      onPickLagunaCenter({ lat: e.latlng.lat, lng: e.latlng.lng });
    }
    map.once('click', onClick);
    return () => {
      map.off('click', onClick);
      container.style.cursor = '';
    };
  }, [pickingLaguna, onPickLagunaCenter]);

  // Draw plot boundary + plan
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old layers
    layersRef.current.forEach(l => map.removeLayer(l));
    layersRef.current = [];

    if (coordinates.length < 3) return;

    const latlngs = coordinates.map(c => [c.lat, c.lng] as L.LatLngTuple);

    // Plot boundary
    const boundary = L.polygon(latlngs, {
      color: '#e8c84a',
      weight: 2.5,
      dashArray: '8 5',
      fill: false,
    }).addTo(map);
    layersRef.current.push(boundary);

    // Fly to bounds
    const bounds = L.latLngBounds(latlngs);
    map.flyToBounds(bounds, { padding: [40, 40], duration: 1 });

    if (!plan) return;

    // Amenity zones
    for (const amenity of plan.amenityZones) {
      for (const ring of amenity.coords) {
        const poly = L.polygon(ring.map(c => [c.lat, c.lng] as L.LatLngTuple), {
          color: amenity.color,
          weight: 1.5,
          fillColor: amenity.color,
          fillOpacity: 0.25,
        }).addTo(map);
        poly.bindTooltip(amenity.label, { permanent: false, direction: 'center', className: 'amenity-tooltip' });
        layersRef.current.push(poly);
      }
    }

    // Roads
    for (const road of plan.roads) {
      for (const ring of road.coords) {
        const poly = L.polygon(ring.map(c => [c.lat, c.lng] as L.LatLngTuple), {
          color: road.type === 'boulevard' ? '#e8c84a' : '#8a9ab5',
          weight: road.type === 'boulevard' ? 1.5 : 0.5,
          fillColor: road.type === 'boulevard' ? 'rgba(232,200,74,0.25)' : 'rgba(138,154,181,0.3)',
          fillOpacity: 1,
        }).addTo(map);
        layersRef.current.push(poly);
      }
    }

    // Lots
    for (const lot of plan.lots) {
      for (let i = 0; i < lot.coords.length; i++) {
        const ring = lot.coords[i];
        const poly = L.polygon(ring.map(c => [c.lat, c.lng] as L.LatLngTuple), {
          color: lot.isLarge ? '#9a7aff' : '#3ecf6e',
          weight: 0.8,
          fillColor: lot.isLarge ? 'rgba(154,122,255,0.3)' : 'rgba(62,207,110,0.25)',
          fillOpacity: 1,
        }).addTo(map);

        if (showLotNumbers && i === 0) {
          const center = poly.getBounds().getCenter();
          const icon = L.divIcon({
            html: `<span style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#dde4f0;background:rgba(11,15,19,0.6);padding:1px 3px;border-radius:2px;">${lot.id}</span>`,
            className: '',
            iconAnchor: [12, 8],
          });
          const marker = L.marker(center, { icon }).addTo(map);
          layersRef.current.push(marker);
        }

        layersRef.current.push(poly);
      }
    }
  }, [coordinates, plan, showLotNumbers, showDimensions]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {pickingLaguna && (
        <div style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(74,158,255,0.92)', color: '#fff',
          fontSize: 12, fontWeight: 600, padding: '6px 16px',
          borderRadius: 20, pointerEvents: 'none', zIndex: 1000,
          fontFamily: 'Inter, sans-serif', letterSpacing: '0.02em',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        }}>
          Clic en el mapa para ubicar la laguna
        </div>
      )}
    </div>
  );
}
