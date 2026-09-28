import React from 'react';
import { Mountain, ArrowRight, Layers, Eye, Cpu, Compass, Sliders, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
  onLoadDemo: (type: 'urban' | 'hilly' | 'sparse' | 'forest') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStart, onLoadDemo }) => {
  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 text-slate-100 p-6 md:p-12 flex flex-col items-center">
      <div className="max-w-4xl w-full flex flex-col items-center text-center space-y-8">
        
        {/* Hero badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-950/80 border border-teal-800/60 text-teal-300 text-xs font-medium">
          <Mountain className="w-3.5 h-3.5" />
          <span>Remote Sensing & Digital Surface Modeling</span>
        </div>

        {/* Hero Title */}
        <div className="space-y-3">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white">
            TerrainAI
          </h1>
          <h2 className="text-xl md:text-2xl font-semibold text-teal-400">
            From One Image to an Interactive 3D World
          </h2>
          <p className="text-sm md:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Estimate terrain structure from single-view RGB remote-sensing imagery and visualize
            the reconstructed surface as an interactive 3D environment.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={onStart}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-teal-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Start Reconstruction</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => onLoadDemo('hilly')}
            className="flex items-center gap-2 px-5 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm border border-slate-700 transition-colors"
          >
            <span>Try Mountain Demo</span>
          </button>
        </div>

        {/* Pipeline Diagram (Required in Section 32) */}
        <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-xl mt-6">
          <h3 className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-6">
            End-to-End Reconstruction Pipeline
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 relative">
            {/* Step 1 */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-lg p-3 text-center flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-blue-900/60 text-blue-300 flex items-center justify-center font-bold text-xs mb-2">
                1
              </div>
              <span className="font-semibold text-xs text-white">IMAGE</span>
              <span className="text-[11px] text-slate-400 mt-1">RGB Optical / GeoTIFF</span>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-lg p-3 text-center flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-purple-900/60 text-purple-300 flex items-center justify-center font-bold text-xs mb-2">
                2
              </div>
              <span className="font-semibold text-xs text-white">AI DEPTH</span>
              <span className="text-[11px] text-slate-400 mt-1">Monocular Inverse Disparity</span>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-lg p-3 text-center flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-amber-900/60 text-amber-300 flex items-center justify-center font-bold text-xs mb-2">
                3
              </div>
              <span className="font-semibold text-xs text-white">CALIBRATION</span>
              <span className="text-[11px] text-slate-400 mt-1">DEM / GCP / Relative</span>
            </div>

            {/* Step 4 */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-lg p-3 text-center flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-emerald-900/60 text-emerald-300 flex items-center justify-center font-bold text-xs mb-2">
                4
              </div>
              <span className="font-semibold text-xs text-white">DSM & SLOPE</span>
              <span className="text-[11px] text-slate-400 mt-1">Elevation Grid & Slope (°)</span>
            </div>

            {/* Step 5 */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-lg p-3 text-center flex flex-col items-center col-span-2 md:col-span-1">
              <div className="w-8 h-8 rounded-full bg-teal-900/60 text-teal-300 flex items-center justify-center font-bold text-xs mb-2">
                5
              </div>
              <span className="font-semibold text-xs text-white">3D TERRAIN</span>
              <span className="text-[11px] text-slate-400 mt-1">Interactive Mesh + Texture</span>
            </div>
          </div>
        </div>

        {/* Accuracy & Integrity Guarantee Card (Section 2) */}
        <div className="w-full bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 text-left text-xs space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-semibold">
            <ShieldAlert className="w-4 h-4" />
            <span>Scientific Accuracy Transparency Principle</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            Single-image depth estimation is fundamentally ambiguous without geometric baselines or LiDAR.
            For standard JPG/PNG files, TerrainAI produces a <strong>Relative Digital Surface Model (rDSM)</strong>
            normalized to [0, 100] relative elevation units, clearly flagged to prevent misleading metric assertions.
            Real meters are computed <strong>only</strong> when validated ground control points (GCPs) or reference DEMs
            are provided.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <div className="bg-slate-800/60 p-3 rounded border border-slate-700/50">
              <span className="text-amber-300 font-semibold block mb-1">Mode C · Relative DSM</span>
              <p className="text-slate-400 text-[11px]">Uncalibrated JPG/PNG images. Values represent relative topographic relief (0–100 units).</p>
            </div>
            <div className="bg-slate-800/60 p-3 rounded border border-slate-700/50">
              <span className="text-teal-300 font-semibold block mb-1">Mode A · DEM Calibrated</span>
              <p className="text-slate-400 text-[11px]">Regression fit against reference raster elevation (e.g. SRTM, ALOS, LiDAR DEM).</p>
            </div>
            <div className="bg-slate-800/60 p-3 rounded border border-slate-700/50">
              <span className="text-emerald-300 font-semibold block mb-1">Mode B · GCP Calibrated</span>
              <p className="text-slate-400 text-[11px]">Least-squares scale & offset fitted to surveyed ground control points in real meters.</p>
            </div>
          </div>
        </div>

        {/* Demo Quick-Loads */}
        <div className="w-full flex flex-col items-center space-y-3">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
            Explore Pre-configured Landscape Testcases
          </span>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full">
            <button
              onClick={() => onLoadDemo('urban')}
              className="p-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-left transition-all group"
            >
              <span className="font-semibold text-xs text-white group-hover:text-teal-400 block">Urban Core</span>
              <span className="text-[11px] text-slate-400">High-rise blocks & street canyons</span>
            </button>
            <button
              onClick={() => onLoadDemo('hilly')}
              className="p-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-left transition-all group"
            >
              <span className="font-semibold text-xs text-white group-hover:text-teal-400 block">Alpine Ridge</span>
              <span className="text-[11px] text-slate-400">Steep mountain cirques & valleys</span>
            </button>
            <button
              onClick={() => onLoadDemo('forest')}
              className="p-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-left transition-all group"
            >
              <span className="font-semibold text-xs text-white group-hover:text-teal-400 block">Highland Forest</span>
              <span className="text-[11px] text-slate-400">Canopy surface & stream clearings</span>
            </button>
            <button
              onClick={() => onLoadDemo('sparse')}
              className="p-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-left transition-all group"
            >
              <span className="font-semibold text-xs text-white group-hover:text-teal-400 block">Desert Dunes</span>
              <span className="text-[11px] text-slate-400">Transverse sand ridges & dry washes</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
