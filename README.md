# TerrainAI – Single Image to 3D Terrain Reconstruction

**TerrainAI** is a full-stack remote-sensing web application that reconstructs relative and metric Digital Surface Models (DSM) and interactive 3D terrain meshes from a single optical RGB image.

---

## 1. Problem Statement & Overview

In remote sensing and Earth observation, measuring 3D terrain topography traditionally requires stereo satellite pairs, LiDAR point clouds, or multi-view photogrammetry (SfM). However, many historical, drone, and satellite captures exist only as **single-view optical RGB images**.

Monocular 3D terrain reconstruction estimates surface relief from visual shading, texture gradients, atmospheric perspective, and learned structural cues.

### The Scientific Accuracy Rule (No Fake Meters)
- **Arbitrary JPG/PNG Images:** Single-image depth is inherently ambiguous. Without external scale reference, the application constructs a **Relative Digital Surface Model (rDSM)** normalized to [0, 100] relative elevation units. The application clearly labels these as **Relative Elevation** and does **not** pretend they are real-world meters.
- **Georeferenced / Reference-Supported Datasets:** When paired with Ground Control Points (GCPs) or reference elevation rasters (e.g., ALOS, SRTM, LiDAR), the system performs regression calibration to compute metric elevation in meters.
- **Validation Transparency:** Error metrics (MAE, RMSE, Pearson $r$, Mean Bias) and spatial residual maps are computed **only** when genuine reference elevation datasets exist.

---

## 2. System Architecture & Pipeline

```
┌─────────────────┐
│  RGB Input      │  (JPG, PNG, TIFF, or GeoTIFF)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Preprocessing   │  Aspect ratio preservation, metadata & CRS extraction
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ AI Depth Engine │  Monocular inverse disparity / structural topographic inversion
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Normalization   │  Dynamic range percentile scaling & edge-preserving smoothing
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Scale Calib.    │  Mode A (DEM regression) | Mode B (GCPs) | Mode C (Relative)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ DSM & Slope     │  Elevation grid & slope = arctan(sqrt(dz/dx² + dz/dy²))
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 3D Mesh & WebGL │  Three.js OrbitControls, RGB drape, height probe, profile tool
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Export & Audit  │  3D OBJ, GeoTIFF raster, PNG colormaps, CSV matrix, JSON report
└─────────────────┘
```

---

## 3. Technology Stack

- **Frontend:**
  - React 19 + TypeScript
  - Vite 8
  - Tailwind CSS 4
  - Three.js WebGL Engine (PlaneGeometry, MeshStandardMaterial, OrbitControls, Raycaster)
  - Lucide Icons
- **Backend Service (Full-Stack Node.js/Express):**
  - Express on port 3000
  - Multer for secure multipart uploads
  - `@google/genai` (Gemini 3.8 Flash for AI Terrain Geomorphology Assessment)
  - `geotiff` parser for embedded CRS, EPSG, resolution, and bounding coordinates
- **Python Backend Architecture (`/backend`):**
  - FastAPI + Uvicorn
  - NumPy, Pillow, OpenCV
  - Rasterio for GeoTIFF reading and writing
  - PyTorch + TorchVision for MiDaS / Depth Anything V2 / ZoeDepth integration
  - SciPy for regression and spatial metrics

---

## 4. Directory Structure

```
├── backend/
│   ├── main.py              # FastAPI REST endpoints
│   ├── depth_model.py       # Swappable depth estimation interface
│   ├── calibration.py       # Mode A (DEM), Mode B (GCP), Mode C (Relative)
│   ├── dsm.py               # Slope, DSM statistics, profile measurement, validation
│   ├── geotiff_util.py      # Geospatial CRS & GeoTIFF export
│   └── requirements.txt     # Python backend dependencies
├── models/
│   └── README.md            # Pretrained weights guide (Depth Anything V2, ZoeDepth, MiDaS)
├── data/
│   └── README.md            # Uploads and bundled demo datasets
├── outputs/
│   └── README.md            # Exported DSMs, OBJ meshes, and reports
├── src/
│   ├── components/
│   │   ├── Header.tsx               # App bar, demo loaders, accuracy badge
│   │   ├── LandingPage.tsx          # Architecture flow & overview
│   │   ├── UploadPanel.tsx          # Drag & drop upload, metadata display
│   │   ├── ProcessingProgress.tsx   # 8-stage progress tracker
│   │   ├── TerrainViewer3D.tsx      # Three.js 3D terrain canvas & measurement
│   │   ├── RasterViewer2D.tsx       # 2D RGB, Depth, Elevation, Slope, Compare tabs
│   │   ├── CalibrationModal.tsx     # Scale calibration editor (DEM / GCPs)
│   │   ├── ValidationPanel.tsx      # MAE, RMSE, Pearson r, Residual map
│   │   ├── AITerrainExplanation.tsx # Gemini geomorphic interpretation
│   │   ├── ExportModal.tsx          # OBJ, GeoTIFF, PNG, CSV downloaders
│   │   └── ProcessingReportView.tsx # Technical audit report
│   ├── utils/
│   │   └── colormaps.ts             # Terrain, Turbo, Viridis, Inferno, Slope colormaps
│   ├── types.ts                     # TypeScript data interfaces
│   ├── App.tsx                      # Root application controller
│   └── index.css                    # Tailwind CSS imports
├── server.ts                # Express full-stack server & Vite middleware
├── package.json
└── README.md
```

---

## 5. How to Run Locally

### Option 1: Full-Stack Web Application (Node.js & Vite)

1. Clone or download the repository.
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open your browser at:
   ```
   http://localhost:3000
   ```

### Option 2: Running the Python FastAPI Backend

If you want to run the separate Python FastAPI microservice:
1. Navigate to the `/backend` folder:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install Python requirements:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI server:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

---

## 6. Step-by-Step User Workflow

1. **Open the Application:** Click **"Start Reconstruction"** or select one of the bundled demo presets (**Mountain**, **Urban**, **Forest**, **Desert**).
2. **Upload an Optical Image:** Drag and drop any JPG, PNG, or GeoTIFF file.
3. **Inspect Geospatial Status:** The application inspects if the file is georeferenced (extracting CRS, EPSG, resolution, and bounding coordinates).
4. **Generate Terrain:** Click **"Generate Terrain"**. Watch the 8-stage progress tracker.
5. **Interactive 3D Navigation:**
   - Left Click + Drag: Rotate terrain in 3D.
   - Right Click + Drag: Pan across the surface.
   - Scroll: Zoom in/out.
   - Adjust **Vertical Exaggeration** (0.5x, 1.0x, 2.0x, 5.0x).
   - Toggle **Wireframe**, **Grid**, or **RGB Texture**.
6. **Terrain Surface Probe:** Hover your cursor over the 3D surface to view real-time $(X, Y)$ pixel coordinates, elevation (meters or relative units), and slope in degrees.
7. **Measure Distances & Heights:**
   - Click **Measure** in the 3D toolbar.
   - Click **Point A**, then click **Point B**.
   - Inspect the horizontal distance, height difference ($\Delta Z$), path gradient, and live cross-section profile graph!
8. **Inspect 2D Maps:** Switch to the **2D Maps & Rasters** tab to view the Original RGB, Monocular Depth Map, Elevation DSM with contour lines, Slope gradient map, or Split-Screen comparison slider.
9. **Scale Calibration:** Click **Calibrate Scale** to calibrate to real meters using Ground Control Points (GCPs) or Reference DEM bounds.
10. **Export Results:** Click **Export Outputs** to download the 3D OBJ mesh, GeoTIFF elevation dataset, CSV elevation matrix, PNG maps, or JSON audit report.

---

## 7. Mathematical Formulations

### Slope Calculation
Topographic slope is computed for every grid cell using central difference gradients:
$$\frac{\partial z}{\partial x} = \frac{z(x+1, y) - z(x-1, y)}{2 \cdot \Delta x}$$
$$\frac{\partial z}{\partial y} = \frac{z(x, y+1) - z(x, y-1)}{2 \cdot \Delta y}$$
$$\text{Slope (radians)} = \arctan\left(\sqrt{\left(\frac{\partial z}{\partial x}\right)^2 + \left(\frac{\partial z}{\partial y}\right)^2}\right)$$
$$\text{Slope (degrees)} = \text{Slope (radians)} \times \frac{180}{\pi}$$

### Validation Quality Metrics
When reference elevation $Z_{\text{ref}}$ is available:
- **Mean Absolute Error (MAE):**
  $$\text{MAE} = \frac{1}{N} \sum_{i=1}^N |Z_{\text{pred}, i} - Z_{\text{ref}, i}|$$
- **Root Mean Square Error (RMSE):**
  $$\text{RMSE} = \sqrt{\frac{1}{N} \sum_{i=1}^N (Z_{\text{pred}, i} - Z_{\text{ref}, i})^2}$$
- **Pearson Correlation ($r$):**
  $$r = \frac{\sum (Z_{\text{pred}} - \bar{Z}_{\text{pred}})(Z_{\text{ref}} - \bar{Z}_{\text{ref}})}{\sqrt{\sum (Z_{\text{pred}} - \bar{Z}_{\text{pred}})^2 \sum (Z_{\text{ref}} - \bar{Z}_{\text{ref}})^2}}$$

---

## 8. Limitations & Best Practices

- **Monocular Ambiguity:** Monocular depth models infer depth from luminance and perspective cues; they cannot guarantee metric millimeter accuracy without physical baselines or LiDAR.
- **Tree Canopy & Buildings:** Optical DSMs capture the visible top-of-canopy and building rooftops (Digital Surface Model), not the bare earth bare-ground terrain (Digital Elevation Model).
- **Sun Illumination Angle:** Deep shadows and extreme specular highlights can cause localized deviations. Edge-preserving filtering and scale calibration minimize these artifacts.
