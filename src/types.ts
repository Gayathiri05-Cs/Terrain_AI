export type CalibrationMode = 'mode_c_relative' | 'mode_a_dem' | 'mode_b_gcp';

export interface GCPPoint {
  id: string;
  pixelX: number;
  pixelY: number;
  elevationM: number;
  label?: string;
}

export interface GeospatialMetadata {
  isGeoreferenced: boolean;
  crs?: string;
  epsg?: number;
  bounds?: { left: number; bottom: number; right: number; top: number };
  pixelResolution?: { x: number; y: number; unit: string };
  message: string;
}

export interface CalibrationResult {
  mode: string;
  is_calibrated: boolean;
  elevation_unit: 'meters' | 'relative_units';
  unit_label: string;
  scale_factor?: number;
  offset?: number;
  min_elevation: number;
  max_elevation: number;
  sample_points_count?: number;
  gcp_count?: number;
  mae_meters?: number;
  rmse_meters?: number;
  mean_bias_meters?: number;
  pearson_correlation?: number;
  notice: string;
}

export interface MeasurementResult {
  pointA: { x: number; y: number; elevation: number };
  pointB: { x: number; y: number; elevation: number };
  deltaElevation: number;
  horizontalDistance: number;
  pathSlopeDeg: number;
  profile: { step: number; distance: number; elevation: number }[];
  unit: string;
  isCalibrated: boolean;
}

export interface ValidationMetrics {
  hasReference: boolean;
  mae?: number;
  rmse?: number;
  bias?: number;
  correlation?: number;
  sampleCount?: number;
  error?: string;
}

export interface ReconstructionSession {
  sessionId: string;
  filename: string;
  fileSizeKb: number;
  format: string;
  width: number;
  height: number;
  dataUrl: string;
  geoMeta: GeospatialMetadata;
  // Grids
  normalizedDepth?: number[][];
  dsm?: number[][];
  slopeGrid?: number[][];
  rgbGrid?: [number, number, number][][];
  referenceDem?: number[][];
  // Stats
  isCalibrated: boolean;
  calibrationMode: CalibrationMode;
  calibrationMeta?: CalibrationResult;
  elevationRange?: { min: number; max: number };
  slopeRange?: { min: number; max: number; avg: number };
  processingTimeMs?: number;
}
