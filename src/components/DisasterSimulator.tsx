import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Waves,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  AlertTriangle,
  Info,
  Droplets,
  Layers,
  CheckCircle2,
  TrendingUp,
  ShieldAlert,
  Download,
  Eye,
  Crosshair,
} from 'lucide-react';
import { ReconstructionSession } from '../types';
import { TerrainViewer3D } from './TerrainViewer3D';

interface DisasterSimulatorProps {
  session: ReconstructionSession;
  exaggeration: number;
  onExaggerationChange: (val: number) => void;
  meshResolution: number;
  onMeshResolutionChange: (val: number) => void;
  onClose?: () => void;
}

export interface FloodSimulationStats {
  totalCells: number;
  floodedCells: number;
  floodedPercentage: number;
  maxFloodDepth: number;
  avgFloodDepth: number;
  lowLyingTotalCells: number;
  lowLyingFloodedCells: number;
  lowLyingFloodedPercentage: number;
  flatFloodedCells: number;
  moderateFloodedCells: number;
  steepFloodedCells: number;
  waterLevel: number;
  unit: string;
}

export const DisasterSimulator: React.FC<DisasterSimulatorProps> = ({
  session,
  exaggeration,
  onExaggerationChange,
  meshResolution,
  onMeshResolutionChange,
  onClose,
}) => {
  // Extract min and max elevation from DSM
  const { minElev, maxElev, elevSpan } = useMemo(() => {
    if (!session.dsm || session.dsm.length === 0) {
      return { minElev: 0, maxElev: 100, elevSpan: 100 };
    }
    const dsm = session.dsm;
    let minE = Infinity;
    let maxE = -Infinity;
    for (let r = 0; r < dsm.length; r++) {
      for (let c = 0; c < dsm[0].length; c++) {
        const val = dsm[r][c];
        if (val < minE) minE = val;
        if (val > maxE) maxE = val;
      }
    }
    return {
      minElev: Number(minE.toFixed(1)),
      maxElev: Number(maxE.toFixed(1)),
      elevSpan: Number(Math.max(1, maxE - minE).toFixed(1)),
    };
  }, [session.dsm]);

  // Simulation State
  const [waterLevel, setWaterLevel] = useState<number>(minElev);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(1); // 0.5x, 1x, 2x, 4x
  const [highlightLowLying, setHighlightLowLying] = useState<boolean>(true);
  const [showWaterSurface, setShowWaterSurface] = useState<boolean>(true);
  const [activeViewMode, setActiveViewMode] = useState<'3d' | '2d_map' | 'split'>('split');
  const [hoveredCell, setHoveredCell] = useState<{
    x: number;
    y: number;
    elev: number;
    depth: number;
    isFlooded: boolean;
  } | null>(null);

  // Synchronize initial water level if session dsm changes
  useEffect(() => {
    setWaterLevel(minElev);
    setIsSimulating(false);
  }, [minElev, session.sessionId]);

  // Animation Loop for "Simulate Rise"
  useEffect(() => {
    if (!isSimulating) return;

    const stepIncrement = (elevSpan / 200) * simulationSpeed;
    const interval = setInterval(() => {
      setWaterLevel((prev) => {
        const next = prev + stepIncrement;
        if (next >= maxElev) {
          setIsSimulating(false);
          return maxElev;
        }
        return Number(next.toFixed(2));
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isSimulating, simulationSpeed, elevSpan, maxElev]);

  // Compute Elevation-Based Flood Statistics
  const stats: FloodSimulationStats = useMemo(() => {
    const dsm = session.dsm;
    const slopeGrid = session.slopeGrid;
    const unit = session.isCalibrated ? 'm' : 'rel. units';

    if (!dsm || dsm.length === 0) {
      return {
        totalCells: 0,
        floodedCells: 0,
        floodedPercentage: 0,
        maxFloodDepth: 0,
        avgFloodDepth: 0,
        lowLyingTotalCells: 0,
        lowLyingFloodedCells: 0,
        lowLyingFloodedPercentage: 0,
        flatFloodedCells: 0,
        moderateFloodedCells: 0,
        steepFloodedCells: 0,
        waterLevel,
        unit,
      };
    }

    const gridH = dsm.length;
    const gridW = dsm[0].length;
    const totalCells = gridH * gridW;

    // Define low-lying threshold: lowest 20% of elevation range
    const lowLyingThreshold = minElev + elevSpan * 0.2;

    let floodedCells = 0;
    let totalDepthSum = 0;
    let maxFloodDepth = 0;
    let lowLyingTotalCells = 0;
    let lowLyingFloodedCells = 0;
    let flatFloodedCells = 0;
    let moderateFloodedCells = 0;
    let steepFloodedCells = 0;

    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        const elev = dsm[y][x];
        const isLowLying = elev <= lowLyingThreshold;
        if (isLowLying) lowLyingTotalCells++;

        if (elev <= waterLevel) {
          floodedCells++;
          const depth = waterLevel - elev;
          totalDepthSum += depth;
          if (depth > maxFloodDepth) maxFloodDepth = depth;
          if (isLowLying) lowLyingFloodedCells++;

          if (slopeGrid) {
            const slope = slopeGrid[y][x];
            if (slope < 5) flatFloodedCells++;
            else if (slope < 15) moderateFloodedCells++;
            else steepFloodedCells++;
          }
        }
      }
    }

    const floodedPercentage = totalCells > 0 ? (floodedCells / totalCells) * 100 : 0;
    const avgFloodDepth = floodedCells > 0 ? totalDepthSum / floodedCells : 0;
    const lowLyingFloodedPercentage =
      lowLyingTotalCells > 0 ? (lowLyingFloodedCells / lowLyingTotalCells) * 100 : 0;

    return {
      totalCells,
      floodedCells,
      floodedPercentage: Number(floodedPercentage.toFixed(1)),
      maxFloodDepth: Number(maxFloodDepth.toFixed(2)),
      avgFloodDepth: Number(avgFloodDepth.toFixed(2)),
      lowLyingTotalCells,
      lowLyingFloodedCells,
      lowLyingFloodedPercentage: Number(lowLyingFloodedPercentage.toFixed(1)),
      flatFloodedCells,
      moderateFloodedCells,
      steepFloodedCells,
      waterLevel,
      unit,
    };
  }, [session.dsm, session.slopeGrid, session.isCalibrated, waterLevel, minElev, elevSpan]);

  // 2D Flood Inundation Canvas Render
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !session.dsm) return;

    const dsm = session.dsm;
    const gridH = dsm.length;
    const gridW = dsm[0].length;

    canvas.width = gridW;
    canvas.height = gridH;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgData = ctx.createImageData(gridW, gridH);
    const data = imgData.data;

    const lowLyingThreshold = minElev + elevSpan * 0.2;

    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        const idx = (y * gridW + x) * 4;
        const elev = dsm[y][x];
        const isFlooded = elev <= waterLevel;

        if (isFlooded) {
          // Calculate relative flood depth from 0 to 1
          const depth = waterLevel - elev;
          const maxD = Math.max(0.1, stats.maxFloodDepth);
          const depthRatio = Math.min(1, Math.max(0, depth / maxD));

          // Color gradient from bright turquoise/cyan (shallow) to deep ocean blue (deep)
          // Shallow: R=56, G=189, B=248 (sky-400)
          // Deep:    R=12, G=74,  B=110 (sky-900)
          const r = Math.round(56 - depthRatio * 44);
          const g = Math.round(189 - depthRatio * 115);
          const b = Math.round(248 - depthRatio * 138);

          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = 255;
        } else {
          // Dry terrain
          const isLowLying = highlightLowLying && elev <= lowLyingThreshold;
          if (isLowLying) {
            // Low-lying dry hazard zone (subtle amber warning tint)
            const normElev = (elev - minElev) / elevSpan;
            const shade = Math.round(normElev * 140 + 70);
            data[idx] = Math.min(255, shade + 50);
            data[idx + 1] = Math.min(255, shade + 20);
            data[idx + 2] = Math.max(0, shade - 30);
            data[idx + 3] = 255;
          } else {
            // Normal dry terrain: topographic hillshade grayscale
            const normElev = (elev - minElev) / elevSpan;
            const shade = Math.round(normElev * 180 + 40);
            data[idx] = shade;
            data[idx + 1] = shade;
            data[idx + 2] = shade;
            data[idx + 3] = 255;
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }, [session.dsm, waterLevel, minElev, elevSpan, stats.maxFloodDepth, highlightLowLying]);

  // Handle 2D Canvas Hover Probe
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !session.dsm) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const px = Math.min(canvas.width - 1, Math.max(0, Math.floor((e.clientX - rect.left) * scaleX)));
    const py = Math.min(canvas.height - 1, Math.max(0, Math.floor((e.clientY - rect.top) * scaleY)));

    const elev = session.dsm[py][px];
    const isFlooded = elev <= waterLevel;
    const depth = isFlooded ? Number((waterLevel - elev).toFixed(2)) : 0;

    setHoveredCell({
      x: px,
      y: py,
      elev: Number(elev.toFixed(2)),
      depth,
      isFlooded,
    });
  };

  // Preset Scenario Handlers
  const applyScenario = (fraction: number) => {
    setIsSimulating(false);
    const target = minElev + elevSpan * fraction;
    setWaterLevel(Number(target.toFixed(1)));
  };

  // Export Flood Simulation Summary
  const handleExportSummary = () => {
    const reportData = {
      title: 'TerrainAI - Elevation-Based Flood Impact Simulation Report',
      dataset: session.filename,
      isCalibrated: session.isCalibrated,
      elevationUnit: stats.unit,
      disclaimer:
        'Elevation-based static inundation model. Does not calculate hydrological flow dynamics or rainfall accumulation.',
      simulationTimestamp: new Date().toISOString(),
      waterSurfaceElevation: stats.waterLevel,
      terrainMinElevation: minElev,
      terrainMaxElevation: maxElev,
      metrics: {
        totalCells: stats.totalCells,
        submergedCells: stats.floodedCells,
        submergedPercentage: `${stats.floodedPercentage}%`,
        maxFloodDepth: `${stats.maxFloodDepth} ${stats.unit}`,
        averageFloodDepth: `${stats.avgFloodDepth} ${stats.unit}`,
        lowLyingVulnerableSubmerged: `${stats.lowLyingFloodedPercentage}%`,
        slopeInundationBreakdown: {
          flatLowlandCells: stats.flatFloodedCells,
          moderateSlopeCells: stats.moderateFloodedCells,
          steepSlopeCells: stats.steepFloodedCells,
        },
      },
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flood_simulation_${session.sessionId.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden select-none">
      {/* Top Banner & Mode Bar */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
            <Waves className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-wide">
                Disaster Simulation
              </h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-sky-950 border border-sky-600/50 text-sky-300">
                Flood Simulator
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                  session.isCalibrated
                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/50'
                    : 'bg-amber-950/80 text-amber-300 border border-amber-700/50'
                }`}
              >
                {session.isCalibrated ? 'Calibrated Elevation (m)' : 'Relative Elevation'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Elevation-Based Flood Impact Simulation · Static Water Surface Inundation Model
            </p>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setActiveViewMode('3d')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                activeViewMode === '3d'
                  ? 'bg-sky-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              3D View
            </button>
            <button
              onClick={() => setActiveViewMode('split')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                activeViewMode === 'split'
                  ? 'bg-sky-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Split 3D + 2D
            </button>
            <button
              onClick={() => setActiveViewMode('2d_map')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                activeViewMode === '2d_map'
                  ? 'bg-sky-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              2D Depth Map
            </button>
          </div>

          <button
            onClick={handleExportSummary}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 transition-colors"
            title="Download Flood Simulation Audit Report"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="px-2.5 py-1 text-xs rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Back to 3D
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Visualization Panel */}
        <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden relative">
          {/* Active View Container */}
          <div className="flex-1 relative overflow-hidden flex">
            {/* 3D Terrain Viewer with Water Level */}
            {(activeViewMode === '3d' || activeViewMode === 'split') && (
              <div
                className={`relative h-full ${
                  activeViewMode === 'split' ? 'w-full lg:w-3/5 border-r border-slate-800' : 'w-full'
                }`}
              >
                <TerrainViewer3D
                  session={session}
                  exaggeration={exaggeration}
                  onExaggerationChange={onExaggerationChange}
                  meshResolution={meshResolution}
                  onMeshResolutionChange={onMeshResolutionChange}
                  waterLevel={waterLevel}
                  showWaterSurface={showWaterSurface}
                  highlightLowLying={highlightLowLying}
                />

                {/* Shimmering Water Level Indicator Tag on 3D View */}
                <div className="absolute top-14 right-3 bg-sky-950/90 backdrop-blur border border-sky-500/50 px-3 py-1.5 rounded-lg shadow-xl text-xs pointer-events-none flex items-center gap-2 z-10">
                  <Droplets className="w-3.5 h-3.5 text-sky-400 animate-bounce" />
                  <span className="text-slate-300">Surface Elev:</span>
                  <span className="font-mono font-bold text-sky-300">
                    {waterLevel} {stats.unit}
                  </span>
                </div>
              </div>
            )}

            {/* 2D Inundation & Depth Heatmap */}
            {(activeViewMode === '2d_map' || activeViewMode === 'split') && (
              <div
                className={`relative h-full flex flex-col bg-slate-900/60 p-3 overflow-hidden ${
                  activeViewMode === 'split' ? 'w-full lg:w-2/5' : 'w-full'
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-sky-400" />
                    <span className="text-xs font-bold text-white">2D Inundation & Depth Map</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Hover over raster to probe depth
                  </span>
                </div>

                {/* Canvas Container */}
                <div className="flex-1 relative flex items-center justify-center p-2 min-h-0">
                  <canvas
                    ref={canvasRef}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseLeave={() => setHoveredCell(null)}
                    className="max-h-full max-w-full object-contain rounded border border-slate-800 shadow-lg cursor-crosshair"
                    style={{ imageRendering: 'pixelated' }}
                  />

                  {/* 2D Probe Tooltip */}
                  {hoveredCell && (
                    <div className="absolute bottom-4 left-4 bg-slate-950/95 border border-sky-500/60 rounded-lg p-2.5 text-xs shadow-2xl z-20 pointer-events-none min-w-[150px]">
                      <div className="flex justify-between text-[10px] text-slate-400 border-b border-slate-800 pb-1 mb-1">
                        <span>Grid Cell</span>
                        <span className="font-mono">[{hoveredCell.x}, {hoveredCell.y}]</span>
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Terrain Elev:</span>
                          <span className="font-mono font-semibold text-white">
                            {hoveredCell.elev} {stats.unit}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Status:</span>
                          <span
                            className={`font-semibold ${
                              hoveredCell.isFlooded ? 'text-sky-400' : 'text-emerald-400'
                            }`}
                          >
                            {hoveredCell.isFlooded ? 'Submerged' : 'Dry'}
                          </span>
                        </div>
                        {hoveredCell.isFlooded && (
                          <div className="flex justify-between text-sky-300 font-bold">
                            <span>Flood Depth:</span>
                            <span className="font-mono">{hoveredCell.depth} {stats.unit}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Colormap Legend */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2 flex items-center justify-between text-[10px] shrink-0 text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-sky-300" />
                    <span>Shallow Flood</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-sky-900" />
                    <span>Deep Flood</span>
                  </div>
                  {highlightLowLying && (
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/70" />
                      <span>Low-Lying Hazard Zone</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-slate-600" />
                    <span>Dry Terrain</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Simulation Controls & Impact Analytics Panel */}
        <aside className="w-full lg:w-84 xl:w-96 bg-slate-900 border-l border-slate-800 p-4 flex flex-col gap-4 overflow-y-auto shrink-0 select-none text-xs">
          {/* Disclaimer Callout Box */}
          <div className="bg-amber-950/30 border border-amber-500/40 rounded-xl p-3 text-[11px] text-amber-200/90 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Elevation-Based Inundation Model</span>
            </div>
            <p className="leading-relaxed text-slate-300 text-[11px]">
              This simulation assesses static flood exposure by intersecting the terrain elevation model with a horizontal water surface. It does not predict hydrodynamic rainfall, river flow velocity, or drainage runoff.
            </p>
          </div>

          {/* Water Level Slider & Direct Controls */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-white font-bold">
                <Sliders className="w-4 h-4 text-sky-400" />
                <span>Water Surface Elevation</span>
              </div>
              <span className="font-mono text-sm font-extrabold text-sky-400 bg-sky-950 px-2 py-0.5 rounded border border-sky-700/60">
                {waterLevel} {stats.unit}
              </span>
            </div>

            {/* Slider */}
            <div className="space-y-1 pt-1">
              <input
                type="range"
                min={minElev}
                max={maxElev}
                step={Number(((maxElev - minElev) / 100).toFixed(2)) || 0.1}
                value={waterLevel}
                onChange={(e) => {
                  setIsSimulating(false);
                  setWaterLevel(Number(parseFloat(e.target.value).toFixed(2)));
                }}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500 focus:outline-none"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>Min: {minElev} {stats.unit}</span>
                <span>Max: {maxElev} {stats.unit}</span>
              </div>
            </div>

            {/* Playback Controls (Simulate Rise / Pause / Reset) */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium text-[11px]">Simulation Playback:</span>
                {/* Speed selector */}
                <div className="flex items-center gap-1">
                  {[0.5, 1, 2, 4].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => setSimulationSpeed(spd)}
                      className={`px-1.5 py-0.5 text-[10px] font-mono rounded ${
                        simulationSpeed === spd
                          ? 'bg-sky-500 text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-white bg-slate-800'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {!isSimulating ? (
                  <button
                    onClick={() => {
                      if (waterLevel >= maxElev) setWaterLevel(minElev);
                      setIsSimulating(true);
                    }}
                    className="col-span-2 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold transition-all shadow-md"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Simulate Rise</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setIsSimulating(false)}
                    className="col-span-2 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all shadow-md animate-pulse"
                  >
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>Pause</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setIsSimulating(false);
                    setWaterLevel(minElev);
                  }}
                  className="flex items-center justify-center gap-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700 font-semibold"
                  title="Reset to Minimum Elevation"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* Inundation Presets */}
            <div className="pt-2 border-t border-slate-800 space-y-1.5">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                Quick Inundation Scenarios
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  onClick={() => applyScenario(0.1)}
                  className="py-1 px-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200 transition-colors font-medium text-center"
                >
                  +10%
                </button>
                <button
                  onClick={() => applyScenario(0.25)}
                  className="py-1 px-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200 transition-colors font-medium text-center"
                >
                  +25%
                </button>
                <button
                  onClick={() => applyScenario(0.5)}
                  className="py-1 px-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200 transition-colors font-medium text-center"
                >
                  +50%
                </button>
                <button
                  onClick={() => applyScenario(0.85)}
                  className="py-1 px-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200 transition-colors font-medium text-center"
                >
                  +85%
                </button>
              </div>
            </div>
          </div>

          {/* Real-time Flood Impact Metrics Card */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Inundation Impact Metrics
            </span>

            {/* Inundated Area Percentage Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-baseline">
                <span className="text-slate-400">Submerged Area:</span>
                <span className="font-mono font-bold text-white text-sm">
                  {stats.floodedPercentage}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-150 rounded-full ${
                    stats.floodedPercentage > 60
                      ? 'bg-rose-500'
                      : stats.floodedPercentage > 30
                      ? 'bg-amber-400'
                      : 'bg-sky-400'
                  }`}
                  style={{ width: `${Math.min(100, stats.floodedPercentage)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>{stats.floodedCells.toLocaleString()} cells inundated</span>
                <span>Total: {stats.totalCells.toLocaleString()} cells</span>
              </div>
            </div>

            {/* Depths & Hazard Zone Grid */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
              <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5">
                <span className="text-[10px] text-slate-400 block">Peak Flood Depth</span>
                <span className="text-sm font-bold font-mono text-sky-400">
                  {stats.maxFloodDepth} {stats.unit}
                </span>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5">
                <span className="text-[10px] text-slate-400 block">Average Depth</span>
                <span className="text-sm font-bold font-mono text-teal-400">
                  {stats.avgFloodDepth} {stats.unit}
                </span>
              </div>
            </div>

            {/* Low-Lying Vulnerability */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" />
                  Low-Lying Hazard Exposure:
                </span>
                <span className="font-mono font-bold text-amber-300">
                  {stats.lowLyingFloodedPercentage}%
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                {stats.lowLyingFloodedCells.toLocaleString()} of {stats.lowLyingTotalCells.toLocaleString()} low-elevation critical cells submerged.
              </p>
            </div>
          </div>

          {/* Visualization Toggles */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Display Overlays
            </span>

            <label className="flex items-center justify-between cursor-pointer py-1">
              <span className="text-slate-300 text-xs">Render 3D Water Plane</span>
              <input
                type="checkbox"
                checked={showWaterSurface}
                onChange={(e) => setShowWaterSurface(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0 cursor-pointer accent-sky-500"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer py-1">
              <span className="text-slate-300 text-xs">Highlight Low-Lying Hazard Zone</span>
              <input
                type="checkbox"
                checked={highlightLowLying}
                onChange={(e) => setHighlightLowLying(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer accent-amber-500"
              />
            </label>
          </div>

          {/* Affected Terrain Slope Breakdown */}
          {session.slopeGrid && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Submerged Terrain Slopes
              </span>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Flat Basin (&lt;5°):</span>
                  <span className="font-mono text-sky-300 font-semibold">
                    {stats.flatFloodedCells.toLocaleString()} cells (High Pooling)
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Gentle Slopes (5°–15°):</span>
                  <span className="font-mono text-amber-300 font-semibold">
                    {stats.moderateFloodedCells.toLocaleString()} cells
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Steep Slopes (&gt;15°):</span>
                  <span className="font-mono text-slate-300 font-semibold">
                    {stats.steepFloodedCells.toLocaleString()} cells (Low Risk)
                  </span>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
