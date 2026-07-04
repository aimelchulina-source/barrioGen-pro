export interface LatLng {
  lat: number;
  lng: number;
}

export type LagunaShape = 'circle' | 'semicircle';

export interface LagunaConfig {
  center: LatLng | null;
  radiusM: number;
  shape: LagunaShape;
  orientationDeg: number;
}

export interface DesignParams {
  boulevardWidth: number;
  secondaryRoadWidth: number;
  setback: number;
  standardLotWidth: number;
  standardLotDepth: number;
  largeLotWidth: number;
  largeLotDepth: number;
  largeLotPercent: number;
  showLotNumbers: boolean;
  showDimensions: boolean;
  lagunaConfig: LagunaConfig;
  amenities: {
    laguna: boolean;
    parqueCentral: boolean;
    clubhouse: boolean;
    entrada: boolean;
    parrillas: boolean;
    canchas: boolean;
  };
}

export interface Project {
  id: string;
  name: string;
  coordinates: LatLng[];
  params: DesignParams;
  createdAt: number;
  updatedAt: number;
}

export interface PlanStats {
  totalLots: number;
  totalArea: number;
  roadCoveragePercent: number;
  greenSpacePercent: number;
  avgLotSize: number;
  perimeter: number;
  standardLots: number;
  largeLots: number;
}

export interface GeneratedPlan {
  lots: LotFeature[];
  roads: RoadFeature[];
  amenityZones: AmenityFeature[];
  stats: PlanStats;
}

export interface LotFeature {
  id: number;
  coords: LatLng[][];
  isLarge: boolean;
  area: number;
}

export interface RoadFeature {
  coords: LatLng[][];
  type: 'boulevard' | 'secondary';
}

export interface AmenityFeature {
  coords: LatLng[][];
  type: keyof DesignParams['amenities'];
  label: string;
  color: string;
}

export interface AISuggestion {
  boulevardWidth?: number;
  secondaryRoadWidth?: number;
  setback?: number;
  standardLotWidth?: number;
  standardLotDepth?: number;
  largeLotWidth?: number;
  largeLotDepth?: number;
  largeLotPercent?: number;
  rationale: string;
}

export const DEFAULT_PARAMS: DesignParams = {
  boulevardWidth: 16,
  secondaryRoadWidth: 10,
  setback: 8,
  standardLotWidth: 20,
  standardLotDepth: 30,
  largeLotWidth: 30,
  largeLotDepth: 40,
  largeLotPercent: 20,
  showLotNumbers: true,
  showDimensions: false,
  lagunaConfig: { center: null, radiusM: 80, shape: 'circle', orientationDeg: 0 },
  amenities: {
    laguna: true,
    parqueCentral: true,
    clubhouse: true,
    entrada: true,
    parrillas: true,
    canchas: true,
  },
};

export const DEMO_COORDS: LatLng[] = [
  { lat: -34.4450, lng: -58.9150 },
  { lat: -34.4405, lng: -58.9150 },
  { lat: -34.4405, lng: -58.9094 },
  { lat: -34.4450, lng: -58.9094 },
];
