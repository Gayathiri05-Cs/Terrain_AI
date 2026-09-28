"""
FastAPI Backend Application for TerrainAI
-----------------------------------------
Entry point for the Python microservice backend.
Handles:
- POST /api/upload
- POST /api/depth
- POST /api/calibrate
- POST /api/dsm
- POST /api/slope
- POST /api/validate
- POST /api/terrain
- GET /api/result/{id}
- GET /api/download/{id}/{type}
- GET /api/health
"""

import os
import uuid
import shutil
import numpy as np
from PIL import Image
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel

# Import local modules
from depth_model import load_model, predict_depth, normalize_depth
from calibration import calibrate_with_dem, calibrate_with_gcps, create_relative_dsm
from dsm import calculate_slope, calculate_dsm_statistics, calculate_validation_metrics, measure_profile
from geotiff_util import inspect_geospatial_metadata, export_geotiff

# Setup directories
UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "uploads"))
OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "outputs"))
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

app = FastAPI(
    title="TerrainAI Backend",
    description="Single-View RGB Image to 3D Terrain Reconstruction API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for active session processing jobs
SESSION_STORE: Dict[str, Dict[str, Any]] = {}

class GCPItem(BaseModel):
    pixel_x: int
    pixel_y: int
    elevation_m: float
    longitude: Optional[float] = None
    latitude: Optional[float] = None

class CalibrateRequest(BaseModel):
    session_id: str
    mode: str  # 'mode_a_dem', 'mode_b_gcp', 'mode_c_relative'
    gcps: Optional[List[GCPItem]] = None

class MeasureRequest(BaseModel):
    session_id: str
    p1_x: int
    p1_y: int
    p2_x: int
    p2_y: int

@app.on_event("startup")
def startup_event():
    print("[TerrainAI] Starting up backend service...")
    load_model()

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "TerrainAI Backend",
        "version": "1.0.0",
        "upload_dir": UPLOAD_DIR,
        "output_dir": OUTPUT_DIR
    }

@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...)):
    """Uploads an optical RGB or GeoTIFF image and extracts metadata."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Uploaded file has no filename.")

    allowed_exts = [".jpg", ".jpeg", ".png", ".tif", ".tiff", ".geotiff"]
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format '{ext}'. Allowed formats: JPG, JPEG, PNG, TIFF, GeoTIFF."
        )

    session_id = str(uuid.uuid4())[:8]
    save_path = os.path.join(UPLOAD_DIR, f"{session_id}_{file.filename}")

    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Read geospatial and format metadata
    geo_meta = inspect_geospatial_metadata(save_path)

    # Validate image readability
    try:
        with Image.open(save_path) as img:
            w, h = img.size
            img_format = img.format or ext.replace(".", "").upper()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Corrupted or invalid image file: {str(e)}")

    file_size_bytes = os.path.getsize(save_path)

    SESSION_STORE[session_id] = {
        "session_id": session_id,
        "file_path": save_path,
        "filename": file.filename,
        "width": w,
        "height": h,
        "file_size_kb": round(file_size_bytes / 1024, 1),
        "format": img_format,
        "geo_meta": geo_meta,
        "is_calibrated": False,
    }

    return {
        "status": "success",
        "session_id": session_id,
        "filename": file.filename,
        "dimensions": {"width": w, "height": h},
        "file_size_kb": round(file_size_bytes / 1024, 1),
        "format": img_format,
        "georeferenced": geo_meta.get("is_georeferenced", False),
        "crs": geo_meta.get("crs"),
        "bounds": geo_meta.get("bounds"),
        "pixel_resolution": geo_meta.get("pixel_resolution"),
        "message": geo_meta.get("message"),
    }

@app.post("/api/depth")
async def generate_depth(session_id: str = Form(...)):
    """Runs monocular depth estimation pipeline and creates relative DSM."""
    if session_id not in SESSION_STORE:
        raise HTTPException(status_code=404, detail="Session not found. Please upload an image first.")

    session = SESSION_STORE[session_id]
    image_path = session["file_path"]

    try:
        with Image.open(image_path) as img:
            rgb_img = img.convert("RGB")
            # Downsample if image is excessively large for fast inference
            max_dim = 1024
            if max(rgb_img.size) > max_dim:
                rgb_img.thumbnail((max_dim, max_dim), Image.Resampling.BILINEAR)

            raw_depth = predict_depth(rgb_img)
            norm_depth = normalize_depth(raw_depth)

            # Store in session
            session["raw_depth"] = raw_depth
            session["norm_depth"] = norm_depth

            # Initial default is Relative DSM (Mode C)
            rel_dsm, rel_meta = create_relative_dsm(norm_depth)
            session["dsm"] = rel_dsm
            session["dsm_meta"] = rel_meta
            session["is_calibrated"] = False

            # Compute slope
            slope = calculate_slope(rel_dsm)
            session["slope"] = slope
            session["stats"] = calculate_dsm_statistics(rel_dsm, is_calibrated=False)

            return {
                "status": "success",
                "session_id": session_id,
                "dsm_type": "Relative DSM",
                "is_calibrated": False,
                "elevation_unit": "relative_units",
                "elevation_range": {"min": session["stats"]["min"], "max": session["stats"]["max"]},
                "slope_range": {"min": float(np.min(slope)), "max": float(np.max(slope))},
                "status_message": "Relative DSM generated. No reference elevation data provided.",
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Depth estimation failed: {str(e)}")

@app.post("/api/calibrate")
async def calibrate_elevation(req: CalibrateRequest):
    """Calibrates relative depth with DEM or GCPs into absolute metric elevation."""
    if req.session_id not in SESSION_STORE:
        raise HTTPException(status_code=404, detail="Session not found.")

    session = SESSION_STORE[req.session_id]
    if "norm_depth" not in session:
        raise HTTPException(status_code=400, detail="Run depth estimation before calibration.")

    norm_depth = session["norm_depth"]

    if req.mode == "mode_b_gcp":
        if not req.gcps or len(req.gcps) < 2:
            raise HTTPException(status_code=400, detail="Mode B requires at least 2 Ground Control Points.")
        gcp_dicts = [g.dict() for g in req.gcps]
        calibrated_dsm, meta = calibrate_with_gcps(norm_depth, gcp_dicts)
    elif req.mode == "mode_c_relative":
        calibrated_dsm, meta = create_relative_dsm(norm_depth)
    else:
        raise HTTPException(status_code=400, detail="Invalid calibration mode or missing DEM reference.")

    session["dsm"] = calibrated_dsm
    session["dsm_meta"] = meta
    session["is_calibrated"] = meta.get("is_calibrated", False)
    session["slope"] = calculate_slope(calibrated_dsm)
    session["stats"] = calculate_dsm_statistics(calibrated_dsm, is_calibrated=session["is_calibrated"])

    return {
        "status": "success",
        "calibration": meta,
        "stats": session["stats"],
    }

@app.post("/api/measure")
async def measure_distance_and_height(req: MeasureRequest):
    """Measures 3D height difference, slope, and cross-section profile between two points."""
    if req.session_id not in SESSION_STORE:
        raise HTTPException(status_code=404, detail="Session not found.")

    session = SESSION_STORE[req.session_id]
    if "dsm" not in session:
        raise HTTPException(status_code=400, detail="DSM not yet generated.")

    profile = measure_profile(
        session["dsm"],
        (req.p1_x, req.p1_y),
        (req.p2_x, req.p2_y),
        pixel_scale_m=1.0,
        is_calibrated=session.get("is_calibrated", False)
    )
    return {"status": "success", "profile": profile}

@app.get("/api/result/{session_id}")
async def get_session_result(session_id: str):
    """Returns metadata and statistics for the current reconstruction session."""
    if session_id not in SESSION_STORE:
        raise HTTPException(status_code=404, detail="Session not found.")

    session = SESSION_STORE[session_id]
    return {
        "session_id": session_id,
        "filename": session.get("filename"),
        "dimensions": {"width": session.get("width"), "height": session.get("height")},
        "is_calibrated": session.get("is_calibrated", False),
        "dsm_meta": session.get("dsm_meta"),
        "stats": session.get("stats"),
    }
