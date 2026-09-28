"""
Geospatial Metadata & GeoTIFF Handling Module for TerrainAI
----------------------------------------------------------
Reads CRS, bounding coordinates, affine transforms, and resolution.
Preserves geospatial metadata when available; never fabricates fake CRS.
"""

from typing import Dict, Any, Optional, Tuple
import os
import numpy as np

def inspect_geospatial_metadata(file_path: str) -> Dict[str, Any]:
    """
    Attempts to read geospatial tags from an image or GeoTIFF file.
    Uses rasterio if available, or falls back to tag inspections.
    """
    info = {
        "is_georeferenced": False,
        "format": os.path.splitext(file_path)[1].upper().replace(".", ""),
        "crs": None,
        "epsg": None,
        "bounds": None,
        "pixel_resolution": None,
        "width": None,
        "height": None,
        "message": "Non-georeferenced image – Relative DSM mode"
    }

    try:
        import rasterio
        with rasterio.open(file_path) as src:
            info["width"] = src.width
            info["height"] = src.height
            if src.crs is not None:
                info["is_georeferenced"] = True
                info["crs"] = str(src.crs)
                try:
                    info["epsg"] = src.crs.to_epsg()
                except Exception:
                    info["epsg"] = None
                
                b = src.bounds
                info["bounds"] = {
                    "left": round(b.left, 4),
                    "bottom": round(b.bottom, 4),
                    "right": round(b.right, 4),
                    "top": round(b.top, 4),
                }
                res = src.res
                info["pixel_resolution"] = {
                    "x": round(res[0], 4),
                    "y": round(res[1], 4),
                    "unit": "meters" if "meter" in str(src.crs).lower() else "degrees"
                }
                info["transform"] = [float(x) for x in src.transform][:6]
                info["message"] = "Georeferenced image detected"
            return info
    except Exception:
        # Fallback to standard PIL to get dimensions if rasterio isn't installed or file is standard JPG/PNG
        pass

    try:
        from PIL import Image
        with Image.open(file_path) as img:
            info["width"], info["height"] = img.size
    except Exception:
        pass

    return info

def export_geotiff(
    output_path: str,
    elevation_data: np.ndarray,
    geo_metadata: Optional[Dict[str, Any]] = None
) -> bool:
    """
    Exports a 2D float32 elevation array as a GeoTIFF.
    If geospatial metadata exists (CRS, transform), it writes standard GeoTIFF tags.
    """
    h, w = elevation_data.shape
    try:
        import rasterio
        from rasterio.transform import from_bounds

        crs = None
        transform = None

        if geo_metadata and geo_metadata.get("is_georeferenced"):
            crs = geo_metadata.get("crs")
            if "bounds" in geo_metadata and geo_metadata["bounds"]:
                b = geo_metadata["bounds"]
                transform = from_bounds(b["left"], b["bottom"], b["right"], b["top"], w, h)
            elif "transform" in geo_metadata:
                transform = rasterio.Affine(*geo_metadata["transform"])

        with rasterio.open(
            output_path,
            "w",
            driver="GTiff",
            height=h,
            width=w,
            count=1,
            dtype="float32",
            crs=crs,
            transform=transform,
        ) as dst:
            dst.write(elevation_data.astype(np.float32), 1)
        return True
    except Exception as e:
        print(f"[TerrainAI GeoTIFF] Rasterio write failed: {e}. Writing fallback binary.")
        # Save raw binary float32
        elevation_data.astype(np.float32).tofile(output_path)
        return True
