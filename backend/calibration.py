"""
Scale Calibration Module for TerrainAI
-------------------------------------
Transforms relative depth predictions into metric Digital Surface Models (DSM).
Supports:
- Mode A: Reference DEM Calibration (Least Squares / RANSAC)
- Mode B: Ground Control Points (GCP) Fitting
- Mode C: Uncalibrated Relative Elevation (0-100 Relative Units)
"""

from typing import Dict, Any, List, Optional, Tuple
import numpy as np

def calibrate_with_dem(
    predicted_depth: np.ndarray,
    reference_dem: np.ndarray,
    nodata_value: float = -9999.0
) -> Tuple[np.ndarray, Dict[str, Any]]:
    """
    Fits a linear mapping Z_metric = scale * PredictedRelativeDepth + offset
    using valid pixels in the reference DEM.
    """
    assert predicted_depth.shape == reference_dem.shape, "Dimensions of predicted depth and DEM must match."

    # Mask valid elevation pixels
    valid_mask = (reference_dem != nodata_value) & (~np.isnan(reference_dem)) & (reference_dem > -500)
    
    if np.sum(valid_mask) < 20:
        raise ValueError("Insufficient valid reference DEM points (< 20 pixels) to calculate calibration.")

    pred_vals = predicted_depth[valid_mask].flatten()
    ref_vals = reference_dem[valid_mask].flatten()

    # Least squares linear regression: y = A*x + b
    A = np.vstack([pred_vals, np.ones(len(pred_vals))]).T
    scale, offset = np.linalg.lstsq(A, ref_vals, rcond=None)[0]

    # Compute calibrated DSM
    calibrated_dsm = scale * predicted_depth + offset

    # Compute error metrics on calibration overlap
    fitted_vals = scale * pred_vals + offset
    residuals = fitted_vals - ref_vals
    mae = float(np.mean(np.abs(residuals)))
    rmse = float(np.sqrt(np.mean(residuals**2)))
    mean_bias = float(np.mean(residuals))

    # Pearson correlation
    corr_matrix = np.corrcoef(pred_vals, ref_vals)
    correlation = float(corr_matrix[0, 1]) if not np.isnan(corr_matrix[0, 1]) else 0.0

    metadata = {
        "mode": "Mode A — Reference DEM Calibration",
        "is_calibrated": True,
        "elevation_unit": "meters",
        "scale_factor": float(scale),
        "offset": float(offset),
        "sample_points_count": int(np.sum(valid_mask)),
        "mae_meters": round(mae, 2),
        "rmse_meters": round(rmse, 2),
        "mean_bias_meters": round(mean_bias, 2),
        "pearson_correlation": round(correlation, 3),
        "min_elevation": float(np.min(calibrated_dsm)),
        "max_elevation": float(np.max(calibrated_dsm)),
    }

    return calibrated_dsm, metadata

def calibrate_with_gcps(
    predicted_depth: np.ndarray,
    gcps: List[Dict[str, Any]]
) -> Tuple[np.ndarray, Dict[str, Any]]:
    """
    Fits scale and offset using Ground Control Points.
    Each GCP should contain:
    - 'pixel_x': int (column in image)
    - 'pixel_y': int (row in image)
    - 'elevation_m': float (known elevation in meters)
    """
    if len(gcps) < 2:
        raise ValueError(f"At least 2 Ground Control Points are required for scale and offset calibration (received {len(gcps)}).")

    h, w = predicted_depth.shape
    pred_samples = []
    known_elevations = []

    for pt in gcps:
        px = int(np.clip(pt.get("pixel_x", 0), 0, w - 1))
        py = int(np.clip(pt.get("pixel_y", 0), 0, h - 1))
        pred_samples.append(predicted_depth[py, px])
        known_elevations.append(float(pt.get("elevation_m", 0.0)))

    pred_arr = np.array(pred_samples)
    ref_arr = np.array(known_elevations)

    A = np.vstack([pred_arr, np.ones(len(pred_arr))]).T
    scale, offset = np.linalg.lstsq(A, ref_arr, rcond=None)[0]

    calibrated_dsm = scale * predicted_depth + offset

    # Residuals on GCP points
    fitted_gcp = scale * pred_arr + offset
    residuals = fitted_gcp - ref_arr
    mae = float(np.mean(np.abs(residuals)))
    rmse = float(np.sqrt(np.mean(residuals**2)))

    metadata = {
        "mode": "Mode B — Ground Control Points (GCP)",
        "is_calibrated": True,
        "elevation_unit": "meters",
        "scale_factor": float(scale),
        "offset": float(offset),
        "gcp_count": len(gcps),
        "mae_meters": round(mae, 2),
        "rmse_meters": round(rmse, 2),
        "min_elevation": float(np.min(calibrated_dsm)),
        "max_elevation": float(np.max(calibrated_dsm)),
    }

    return calibrated_dsm, metadata

def create_relative_dsm(
    normalized_depth: np.ndarray,
    relative_range: float = 100.0
) -> Tuple[np.ndarray, Dict[str, Any]]:
    """
    Converts normalized depth [0.0, 1.0] to a Relative DSM in [0, 100] relative elevation units.
    Does NOT fabricate real meters.
    """
    relative_dsm = normalized_depth * relative_range
    metadata = {
        "mode": "Mode C — Relative DSM (Uncalibrated)",
        "is_calibrated": False,
        "elevation_unit": "relative_units",
        "unit_label": "rel. units",
        "range_min": 0.0,
        "range_max": float(relative_range),
        "notice": "Metric elevation calibration unavailable. Showing relative elevation (0–100 units).",
    }
    return relative_dsm, metadata
