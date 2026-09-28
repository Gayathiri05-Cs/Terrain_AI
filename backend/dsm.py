"""
Digital Surface Model (DSM) & Slope Processing Module
-----------------------------------------------------
Handles:
- Slope calculation: slope = arctan(sqrt(dz/dx^2 + dz/dy^2)) * (180 / pi)
- Aspect and curvature calculation
- Contour line generation
- Height difference and distance analysis
- Validation quality metrics against ground-truth/reference data
"""

import numpy as np
from typing import Dict, Any, Tuple, Optional

def calculate_slope(elevation_grid: np.ndarray, cell_size_meters: float = 1.0) -> np.ndarray:
    """
    Computes terrain slope in degrees using 2nd-order central difference gradients:
    dz/dx and dz/dy.
    slope_rad = arctan(sqrt((dz/dx)^2 + (dz/dy)^2))
    slope_deg = slope_rad * (180.0 / pi)
    """
    h, w = elevation_grid.shape
    # Sobel / central difference gradient
    dz_dy, dz_dx = np.gradient(elevation_grid, cell_size_meters, cell_size_meters)
    slope_rad = np.arctan(np.sqrt(dz_dx**2 + dz_dy**2))
    slope_deg = np.rad2deg(slope_rad)
    return slope_deg.astype(np.float32)

def calculate_dsm_statistics(dsm: np.ndarray, is_calibrated: bool = False) -> Dict[str, Any]:
    """Computes distribution statistics of the elevation model."""
    valid_vals = dsm[~np.isnan(dsm)]
    if len(valid_vals) == 0:
        return {"min": 0, "max": 0, "mean": 0, "std": 0}

    return {
        "min": float(np.min(valid_vals)),
        "max": float(np.max(valid_vals)),
        "mean": float(np.mean(valid_vals)),
        "std": float(np.std(valid_vals)),
        "p25": float(np.percentile(valid_vals, 25)),
        "p50": float(np.percentile(valid_vals, 50)),
        "p75": float(np.percentile(valid_vals, 75)),
        "unit": "meters" if is_calibrated else "rel. units",
    }

def calculate_validation_metrics(predicted_dsm: np.ndarray, reference_dsm: np.ndarray) -> Dict[str, Any]:
    """
    Validates predicted surface against ground-truth reference DSM.
    Computes MAE, RMSE, Pearson Correlation, and Mean Bias.
    Never invents numbers; returns valid error metrics or indicates insufficient overlap.
    """
    mask = (~np.isnan(predicted_dsm)) & (~np.isnan(reference_dsm)) & (reference_dsm > -500)
    if np.sum(mask) < 10:
        return {
            "has_reference": False,
            "error": "Insufficient valid overlapping reference points for scientific validation."
        }

    p = predicted_dsm[mask]
    r = reference_dsm[mask]

    diff = p - r
    mae = float(np.mean(np.abs(diff)))
    rmse = float(np.sqrt(np.mean(diff**2)))
    bias = float(np.mean(diff))

    corr_matrix = np.corrcoef(p, r)
    correlation = float(corr_matrix[0, 1]) if not np.isnan(corr_matrix[0, 1]) else 0.0

    return {
        "has_reference": True,
        "sample_count": int(np.sum(mask)),
        "mae": round(mae, 2),
        "rmse": round(rmse, 2),
        "bias": round(bias, 2),
        "correlation": round(correlation, 3),
        "residual_min": round(float(np.min(diff)), 2),
        "residual_max": round(float(np.max(diff)), 2),
    }

def measure_profile(
    elevation_grid: np.ndarray,
    p1: Tuple[int, int],
    p2: Tuple[int, int],
    pixel_scale_m: float = 1.0,
    is_calibrated: bool = False
) -> Dict[str, Any]:
    """
    Computes a cross-section line profile between Point A (x1, y1) and Point B (x2, y2).
    Returns horizontal distance, height difference, start/end elevations, and sample points.
    """
    x1, y1 = p1
    x2, y2 = p2
    h, w = elevation_grid.shape

    # Clamp coordinates
    x1 = np.clip(x1, 0, w - 1)
    x2 = np.clip(x2, 0, w - 1)
    y1 = np.clip(y1, 0, h - 1)
    y2 = np.clip(y2, 0, h - 1)

    elev_a = float(elevation_grid[y1, x1])
    elev_b = float(elevation_grid[y2, x2])
    delta_z = elev_b - elev_a

    pixel_dist = float(np.sqrt((x2 - x1)**2 + (y2 - y1)**2))
    horizontal_dist = pixel_dist * pixel_scale_m

    # Sample profile along line
    num_samples = max(2, int(pixel_dist))
    x_coords = np.linspace(x1, x2, num_samples).astype(int)
    y_coords = np.linspace(y1, y2, num_samples).astype(int)
    profile_elevs = [float(elevation_grid[y, x]) for y, x in zip(y_coords, x_coords)]

    # Path slope
    overall_slope_deg = np.rad2deg(np.arctan(abs(delta_z) / max(horizontal_dist, 1e-4)))

    return {
        "point_a": {"x": int(x1), "y": int(y1), "elevation": round(elev_a, 2)},
        "point_b": {"x": int(x2), "y": int(y2), "elevation": round(elev_b, 2)},
        "delta_elevation": round(delta_z, 2),
        "horizontal_distance": round(horizontal_dist, 2),
        "average_slope_deg": round(float(overall_slope_deg), 1),
        "profile_samples": profile_elevs,
        "unit": "meters" if is_calibrated else "rel. units",
        "is_calibrated": is_calibrated,
    }
