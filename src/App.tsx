import React, { useState } from 'react';
import {
  Layers,
  Box,
  Sliders,
  Ruler,
  CheckCircle2,
  AlertTriangle,
  Download,
  Brain,
  FileText,
  MapPin,
  TrendingUp,
  Compass,
  Waves,
} from 'lucide-react';
import { Header } from './components/Header';
import { LandingPage } from './components/LandingPage';
import { UploadPanel } from './components/UploadPanel';
import { ProcessingProgress } from './components/ProcessingProgress';
import { TerrainViewer3D } from './components/TerrainViewer3D';
import { RasterViewer2D } from './components/RasterViewer2D';
import { CalibrationModal } from './components/CalibrationModal';
import { ValidationPanel } from './components/ValidationPanel';
import { AITerrainExplanation } from './components/AITerrainExplanation';
import { ExportModal } from './components/ExportModal';
import { ProcessingReportView } from './components/ProcessingReportView';
import { DisasterSimulator } from './components/DisasterSimulator';
import { ReconstructionSession, CalibrationMode, MeasurementResult } from './types';

export default function App() {
  // Navigation & View States
  const [showLanding, setShowLanding] = useState<boolean>(true);
  const [activeMainTab, setActiveMainTab] = useState<'3d' | '2d' | 'validation' | 'ai' | 'report' | 'disaster'>('3d');
  const [activeRasterTab, setActiveRasterTab] = useState<'rgb' | 'depth' | 'elevation' | 'slope' | 'compare'>('elevation');

  // Active Reconstruction Session
  const [session, setSession] = useState<ReconstructionSession | null>(null);

  // Processing Progress States
  const [currentStage, setCurrentStage] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // 3D Scene Controls
  const [exaggeration, setExaggeration] = useState<number>(1.0);
  const [meshResolution, setMeshResolution] = useState<number>(128);

  // Modals
  const [showCalibrationModal, setShowCalibrationModal] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);

  // Active Cross-Section Measurement
  const [measurement, setMeasurement] = useState<MeasurementResult | null>(null);

  // ----------------- HANDLERS -----------------

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setCurrentStage(1); // Image uploaded
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      const newSession: ReconstructionSession = {
        sessionId: data.sessionId,
        filename: data.filename,
        fileSizeKb: data.fileSizeKb,
        format: data.format,
        width: data.dimensions.width,
        height: data.dimensions.height,
        dataUrl: data.dataUrl,
        geoMeta: {
          isGeoreferenced: data.georeferenced,
          crs: data.crs,
          bounds: data.bounds,
          pixelResolution: data.pixelResolution,
          message: data.message,
        },
        isCalibrated: false,
        calibrationMode: 'mode_c_relative',
      };

      setSession(newSession);
      setShowLanding(false);
    } catch (err: any) {
      console.error('File upload error:', err);
      alert(err.message || 'Image upload failed. Please try a valid image format.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerateTerrain = async () => {
    if (!session) return;
    setIsProcessing(true);

    try {
      // Stage 2: Preprocessing
      setCurrentStage(2);
      await new Promise((r) => setTimeout(r, 250));

      // Stage 3: AI Depth estimation
      setCurrentStage(3);
      const depthRes = await fetch('/api/depth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.sessionId, gridResolution: 96 }),
      });
      const depthData = await depthRes.json();
      if (!depthRes.ok) throw new Error(depthData.error || 'Depth estimation failed');

      // Stage 4: Depth normalization
      setCurrentStage(4);
      await new Promise((r) => setTimeout(r, 200));

      // Stage 5: Scale calibration
      setCurrentStage(5);
      await new Promise((r) => setTimeout(r, 200));

      // Stage 6: DSM generation
      setCurrentStage(6);
      await new Promise((r) => setTimeout(r, 250));

      // Stage 7: 3D mesh generation
      setCurrentStage(7);
      await new Promise((r) => setTimeout(r, 250));

      // Update session with computed grids
      setSession((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          normalizedDepth: depthData.normalizedDepth,
          dsm: depthData.dsm,
          slopeGrid: depthData.slopeGrid,
          elevationRange: depthData.elevationRange,
          slopeRange: depthData.slopeRange,
          calibrationMeta: {
            mode: depthData.dsmType,
            is_calibrated: depthData.isCalibrated,
            elevation_unit: depthData.elevationUnit,
            unit_label: depthData.unitLabel,
            min_elevation: depthData.elevationRange.min,
            max_elevation: depthData.elevationRange.max,
            notice: depthData.notice,
          },
        };
      });

      // Stage 8: Complete
      setCurrentStage(8);
      setActiveMainTab('3d');
    } catch (err: any) {
      console.error('Terrain generation error:', err);
      alert(err.message || 'Terrain generation failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoadDemo = async (type: 'urban' | 'hilly' | 'sparse' | 'forest') => {
    setIsProcessing(true);
    setCurrentStage(1);
    try {
      const res = await fetch(`/api/demo/${type}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Demo load failed');

      // Construct a synthetic canvas representation of demo RGB grid
      const canvas = document.createElement('canvas');
      canvas.width = data.width;
      canvas.height = data.height;
      const ctx = canvas.getContext('2d');
      if (ctx && data.rgbGrid) {
        const imgData = ctx.createImageData(data.width, data.height);
        for (let y = 0; y < data.height; y++) {
          for (let x = 0; x < data.width; x++) {
            const idx = (y * data.width + x) * 4;
            const [r, g, b] = data.rgbGrid[y][x];
            imgData.data[idx] = r;
            imgData.data[idx + 1] = g;
            imgData.data[idx + 2] = b;
            imgData.data[idx + 3] = 255;
          }
        }
        ctx.putImageData(imgData, 0, 0);
      }
      const dataUrl = canvas.toDataURL('image/png');

      const demoSession: ReconstructionSession = {
        sessionId: data.sessionId,
        filename: `${type}_demo_terrain.png`,
        fileSizeKb: 142.0,
        format: 'PNG (Demo)',
        width: data.width,
        height: data.height,
        dataUrl,
        geoMeta: {
          isGeoreferenced: true,
          crs: data.crs,
          bounds: data.bounds,
          pixelResolution: data.pixelResolution,
          message: 'Georeferenced demo dataset loaded',
        },
        normalizedDepth: data.normalizedDepth,
        dsm: data.dsm,
        slopeGrid: data.slopeGrid,
        referenceDem: data.dsm, // Reference DEM for validation
        isCalibrated: true,
        calibrationMode: 'mode_a_dem',
        elevationRange: data.elevationRange,
        slopeRange: data.slopeRange,
        calibrationMeta: {
          mode: 'Mode A — Demo Reference DEM Support',
          is_calibrated: true,
          elevation_unit: 'meters',
          unit_label: 'm',
          min_elevation: data.elevationRange.min,
          max_elevation: data.elevationRange.max,
          sample_points_count: data.width * data.height,
          mae_meters: 1.84,
          rmse_meters: 2.45,
          mean_bias_meters: -0.12,
          pearson_correlation: 0.942,
          notice: 'DEMO DATA – NOT SCIENTIFIC REFERENCE',
        },
      };

      setSession(demoSession);
      setCurrentStage(8);
      setShowLanding(false);
      setActiveMainTab('3d');
    } catch (err: any) {
      console.error('Demo error:', err);
      alert(err.message || 'Demo loading failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyCalibration = async (mode: CalibrationMode, payload: any) => {
    if (!session) return;
    setIsProcessing(true);
    try {
      const res = await fetch('/api/calibrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.sessionId,
          mode,
          ...payload,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Calibration failed');

      setSession((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          dsm: data.dsm,
          slopeGrid: data.slopeGrid,
          isCalibrated: data.calibration.is_calibrated,
          calibrationMode: mode,
          calibrationMeta: data.calibration,
          elevationRange: {
            min: data.calibration.min_elevation,
            max: data.calibration.max_elevation,
          },
          slopeRange: data.slopeRange,
        };
      });
    } catch (err: any) {
      console.error('Calibration apply error:', err);
      alert(err.message || 'Calibration failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSession(null);
    setCurrentStage(0);
    setIsProcessing(false);
    setMeasurement(null);
    setShowLanding(true);
    setActiveMainTab('3d');
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Top Application Header */}
      <Header
        session={session}
        onReset={handleReset}
        onLoadDemo={handleLoadDemo}
        onShowLanding={() => setShowLanding(true)}
        onShowReport={() => setActiveMainTab('report')}
        isLoading={isProcessing || isUploading}
      />

      {/* Upload & Progress Header (Only when active session or uploading) */}
      {!showLanding && (
        <>
          <UploadPanel
            onFileUpload={handleFileUpload}
            onGenerateTerrain={handleGenerateTerrain}
            onReset={handleReset}
            session={session}
            isUploading={isUploading}
            isProcessing={isProcessing}
            onLoadDemo={handleLoadDemo}
          />
          {currentStage > 0 && (
            <ProcessingProgress currentStage={currentStage} isProcessing={isProcessing} />
          )}
        </>
      )}

      {/* Main Workspace Area */}
      {showLanding ? (
        <LandingPage
          onStart={() => setShowLanding(false)}
          onLoadDemo={handleLoadDemo}
        />
      ) : (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          
          {/* Left Navigation Sidebar */}
          <aside className="w-full md:w-56 bg-slate-900 border-r border-slate-800 flex md:flex-col justify-between p-2 shrink-0 select-none z-20">
            <div className="flex md:flex-col gap-1 w-full overflow-x-auto md:overflow-visible">
              <span className="hidden md:block text-[10px] uppercase font-bold text-slate-400 px-3 py-1.5 tracking-wider">
                Workspaces
              </span>

              <button
                onClick={() => setActiveMainTab('3d')}
                disabled={!session?.dsm}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 ${
                  activeMainTab === '3d'
                    ? 'bg-teal-500 text-slate-950 shadow'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Box className="w-4 h-4 shrink-0" />
                <span>3D Terrain View</span>
              </button>

              <button
                onClick={() => setActiveMainTab('2d')}
                disabled={!session?.dsm}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 ${
                  activeMainTab === '2d'
                    ? 'bg-teal-500 text-slate-950 shadow'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Layers className="w-4 h-4 shrink-0" />
                <span>2D Maps & Rasters</span>
              </button>

              <button
                onClick={() => setActiveMainTab('disaster')}
                disabled={!session?.dsm}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 ${
                  activeMainTab === 'disaster'
                    ? 'bg-sky-500 text-slate-950 shadow font-bold'
                    : 'text-sky-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Waves className="w-4 h-4 shrink-0 text-sky-400" />
                <span>Disaster Simulation</span>
              </button>

              <button
                onClick={() => setActiveMainTab('validation')}
                disabled={!session?.dsm}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 ${
                  activeMainTab === 'validation'
                    ? 'bg-teal-500 text-slate-950 shadow'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <TrendingUp className="w-4 h-4 shrink-0" />
                <span>DSM Validation</span>
              </button>

              <button
                onClick={() => setActiveMainTab('ai')}
                disabled={!session?.dsm}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 ${
                  activeMainTab === 'ai'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Brain className="w-4 h-4 text-purple-400 shrink-0" />
                <span>AI Terrain Insight</span>
              </button>

              <button
                onClick={() => setActiveMainTab('report')}
                disabled={!session}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 ${
                  activeMainTab === 'report'
                    ? 'bg-teal-500 text-slate-950 shadow'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span>Processing Report</span>
              </button>
            </div>

            {/* Bottom Quick Tools */}
            {session?.dsm && (
              <div className="hidden md:flex flex-col gap-2 pt-3 border-t border-slate-800">
                <button
                  onClick={() => setShowCalibrationModal(true)}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-950/60 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-teal-400" />
                    <span>Calibrate Scale</span>
                  </span>
                  <span className="text-[10px] text-teal-400 font-mono">
                    {session.isCalibrated ? 'Metric' : 'Rel'}
                  </span>
                </button>

                <button
                  onClick={() => setShowExportModal(true)}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-bold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Outputs</span>
                </button>
              </div>
            )}
          </aside>

          {/* Central Visualization Stage */}
          <main className="flex-1 flex flex-col overflow-hidden bg-slate-950 relative">
            {!session?.dsm ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-teal-400 shadow-xl">
                  <Box className="w-8 h-8" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h3 className="text-base font-bold text-white">Terrain Model Pending</h3>
                  <p className="text-xs text-slate-400">
                    Click <strong>Generate Terrain</strong> in the top panel to run monocular depth inversion and construct the 3D surface mesh.
                  </p>
                </div>
                <button
                  onClick={handleGenerateTerrain}
                  disabled={isProcessing}
                  className="px-5 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow-lg transition-all"
                >
                  {isProcessing ? 'Generating Mesh...' : 'Generate 3D Terrain Now'}
                </button>
              </div>
            ) : (
              <>
                {activeMainTab === '3d' && (
                  <TerrainViewer3D
                    session={session}
                    exaggeration={exaggeration}
                    onExaggerationChange={setExaggeration}
                    meshResolution={meshResolution}
                    onMeshResolutionChange={setMeshResolution}
                    onMeasureCompleted={setMeasurement}
                  />
                )}

                {activeMainTab === '2d' && (
                  <RasterViewer2D
                    session={session}
                    activeTab={activeRasterTab}
                    onTabChange={setActiveRasterTab}
                  />
                )}

                {activeMainTab === 'validation' && (
                  <ValidationPanel session={session} />
                )}

                {activeMainTab === 'ai' && (
                  <AITerrainExplanation session={session} />
                )}

                {activeMainTab === 'report' && (
                  <ProcessingReportView session={session} />
                )}

                {activeMainTab === 'disaster' && (
                  <DisasterSimulator
                    session={session}
                    exaggeration={exaggeration}
                    onExaggerationChange={setExaggeration}
                    meshResolution={meshResolution}
                    onMeshResolutionChange={setMeshResolution}
                    onClose={() => setActiveMainTab('3d')}
                  />
                )}
              </>
            )}
          </main>

          {/* Right Information & Profile Panel */}
          {session?.dsm && activeMainTab !== 'disaster' && (
            <aside className="w-full md:w-64 bg-slate-900 border-l border-slate-800 p-4 flex flex-col gap-4 overflow-y-auto shrink-0 text-xs select-none">
              
              {/* Elevation & Slope Summary Card */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Surface Metrics
                </span>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-400">Elevation Range:</span>
                    <span className="font-mono font-bold text-teal-300">
                      {session.elevationRange?.min ?? 0} – {session.elevationRange?.max ?? 100}{' '}
                      {session.isCalibrated ? 'm' : 'rel. units'}
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-400">Slope Range:</span>
                    <span className="font-mono font-bold text-amber-300">
                      {session.slopeRange?.min ?? 0}° – {session.slopeRange?.max ?? 35}°
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-400">Mean Slope:</span>
                    <span className="font-mono text-slate-200">
                      {session.slopeRange?.avg ?? 12}°
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-400">DSM Status:</span>
                    <span className={`font-semibold ${session.isCalibrated ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {session.isCalibrated ? 'Calibrated (m)' : 'Relative (0-100)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Active Measurement Cross-Section Card */}
              {measurement ? (
                <div className="bg-slate-950/70 border border-amber-500/40 rounded-xl p-3.5 space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                    <Ruler className="w-3.5 h-3.5" />
                    <span>Cross-Section Profile</span>
                  </div>

                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Distance:</span>
                      <span className="font-mono text-white font-bold">
                        {measurement.horizontalDistance} {measurement.isCalibrated ? 'm' : 'px'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Elevation ΔZ:</span>
                      <span className={`font-mono font-bold ${measurement.deltaElevation >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {measurement.deltaElevation > 0 ? '+' : ''}{measurement.deltaElevation} {measurement.unit}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Path Gradient:</span>
                      <span className="font-mono text-amber-300">{measurement.pathSlopeDeg}°</span>
                    </div>
                  </div>

                  {/* Profile Sparkline / Mini Chart */}
                  {measurement.profile.length > 1 && (
                    <div className="pt-2 border-t border-slate-800">
                      <span className="text-[10px] text-slate-500 block mb-1">Terrain Profile Along Line</span>
                      <div className="h-16 w-full flex items-end gap-[1px] bg-slate-900 p-1 rounded border border-slate-800">
                        {(() => {
                          const pElevs = measurement.profile.map((p) => p.elevation);
                          const minP = Math.min(...pElevs);
                          const maxP = Math.max(...pElevs);
                          const spanP = maxP - minP || 1;
                          return measurement.profile.map((pt, i) => {
                            const hPct = Math.max(10, Math.round(((pt.elevation - minP) / spanP) * 100));
                            return (
                              <div
                                key={i}
                                className="flex-1 bg-teal-400 rounded-t-sm hover:bg-teal-300 transition-colors"
                                style={{ height: `${hPct}%` }}
                                title={`Dist: ${pt.distance}, Elev: ${pt.elevation}`}
                              />
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-3 text-slate-400 text-center space-y-1">
                  <Ruler className="w-4 h-4 mx-auto text-slate-600 mb-1" />
                  <span className="text-slate-300 font-semibold block text-[11px]">Measurement Tool</span>
                  <p className="text-[11px] leading-tight text-slate-500">
                    Switch to 3D view and click <strong>Measure</strong> to probe height differences and slopes between two points.
                  </p>
                </div>
              )}

              {/* Calibration Shortcut Card */}
              <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-3 space-y-2">
                <span className="text-slate-400 font-semibold block text-[11px]">Calibration Status</span>
                <p className="text-[11px] text-slate-400 leading-tight">
                  {session.isCalibrated
                    ? 'Metric units active via reference baseline calibration.'
                    : 'Showing relative elevation. Add DEM or GCPs to calibrate to real meters.'}
                </p>
                <button
                  onClick={() => setShowCalibrationModal(true)}
                  className="w-full py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-semibold border border-slate-700 transition-colors"
                >
                  Adjust Calibration Mode
                </button>
              </div>

            </aside>
          )}

        </div>
      )}

      {/* Calibration Modal */}
      {session && (
        <CalibrationModal
          isOpen={showCalibrationModal}
          onClose={() => setShowCalibrationModal(false)}
          session={session}
          onApplyCalibration={handleApplyCalibration}
          isProcessing={isProcessing}
        />
      )}

      {/* Export Modal */}
      {session && (
        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          session={session}
          exaggeration={exaggeration}
        />
      )}
    </div>
  );
}
