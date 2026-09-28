import React, { useState, useMemo, useRef } from 'react';
import { Layers, Eye, Sliders, SplitSquareVertical, Compass, Info } from 'lucide-react';
import { ReconstructionSession } from '../types';
import { gridToDataUrl, ColormapName } from '../utils/colormaps';

interface RasterViewer2DProps {
  session: ReconstructionSession;
  activeTab: 'rgb' | 'depth' | 'elevation' | 'slope' | 'compare';
  onTabChange: (tab: 'rgb' | 'depth' | 'elevation' | 'slope' | 'compare') => void;
}

export const RasterViewer2D: React.FC<RasterViewer2DProps> = ({ session, activeTab, onTabChange }) => {
  const [colormap, setColormap] = useState<ColormapName>('terrain');
  const [showContours, setShowContours] = useState<boolean>(true);
  const [compareSplit, setCompareSplit] = useState<number>(50); // percentage 0-100
  const [hoverPixel, setHoverPixel] = useState<{ x: number; y: number; val: number; label: string } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Generate 2D raster views as data URLs
  const depthDataUrl = useMemo(() => {
    if (!session.normalizedDepth) return '';
    return gridToDataUrl(session.normalizedDepth, colormap === 'terrain' ? 'inferno' : colormap, 0, 1);
  }, [session.normalizedDepth, colormap]);

  const elevationDataUrl = useMemo(() => {
    if (!session.dsm) return '';
    const min = session.elevationRange?.min ?? 0;
    const max = session.elevationRange?.max ?? 100;
    return gridToDataUrl(session.dsm, 'terrain', min, max, showContours, 8);
  }, [session.dsm, session.elevationRange, showContours]);

  const slopeDataUrl = useMemo(() => {
    if (!session.slopeGrid) return '';
    const maxS = Math.max(45, session.slopeRange?.max ?? 45);
    return gridToDataUrl(session.slopeGrid, 'slope', 0, maxS);
  }, [session.slopeGrid, session.slopeRange]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const px = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const py = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));

    if (activeTab === 'elevation' && session.dsm) {
      const h = session.dsm.length;
      const w = session.dsm[0].length;
      const gx = Math.min(w - 1, Math.floor(px * w));
      const gy = Math.min(h - 1, Math.floor(py * h));
      setHoverPixel({
        x: gx,
        y: gy,
        val: session.dsm[gy][gx],
        label: `Elev: ${session.dsm[gy][gx]} ${session.isCalibrated ? 'm' : 'rel. units'}`,
      });
    } else if (activeTab === 'slope' && session.slopeGrid) {
      const h = session.slopeGrid.length;
      const w = session.slopeGrid[0].length;
      const gx = Math.min(w - 1, Math.floor(px * w));
      const gy = Math.min(h - 1, Math.floor(py * h));
      setHoverPixel({
        x: gx,
        y: gy,
        val: session.slopeGrid[gy][gx],
        label: `Slope: ${session.slopeGrid[gy][gx]}°`,
      });
    } else if (activeTab === 'depth' && session.normalizedDepth) {
      const h = session.normalizedDepth.length;
      const w = session.normalizedDepth[0].length;
      const gx = Math.min(w - 1, Math.floor(px * w));
      const gy = Math.min(h - 1, Math.floor(py * h));
      setHoverPixel({
        x: gx,
        y: gy,
        val: session.normalizedDepth[gy][gx],
        label: `Norm Depth: ${session.normalizedDepth[gy][gx]}`,
      });
    } else {
      setHoverPixel(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 select-none">
      {/* Controls Bar */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Sub-view navigation tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          {(['rgb', 'depth', 'elevation', 'slope', 'compare'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`px-3 py-1 text-xs font-semibold rounded-md capitalize transition-colors ${
                activeTab === tab
                  ? 'bg-teal-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab === 'rgb' ? 'Original RGB' : tab}
            </button>
          ))}
        </div>

        {/* Dynamic Controls based on tab */}
        <div className="flex items-center gap-3 text-xs">
          {activeTab === 'depth' && (
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Colormap:</span>
              {(['inferno', 'turbo', 'viridis', 'greyscale'] as ColormapName[]).map((cmap) => (
                <button
                  key={cmap}
                  onClick={() => setColormap(cmap)}
                  className={`px-2 py-0.5 rounded capitalize ${
                    colormap === cmap ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cmap}
                </button>
              ))}
            </div>
          )}

          {activeTab === 'elevation' && (
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={showContours}
                onChange={(e) => setShowContours(e.target.checked)}
                className="rounded accent-teal-500"
              />
              <span>Contour Lines</span>
            </label>
          )}

          {activeTab === 'compare' && (
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Split: {compareSplit}%</span>
              <input
                type="range"
                min="0"
                max="100"
                value={compareSplit}
                onChange={(e) => setCompareSplit(parseInt(e.target.value))}
                className="w-28 accent-teal-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Main Image Stage */}
      <div
        ref={containerRef}
        className="flex-1 relative flex items-center justify-center p-4 overflow-hidden bg-slate-950"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverPixel(null)}
      >
        {activeTab === 'rgb' && (
          <img
            src={session.dataUrl}
            alt="Original Satellite RGB"
            className="max-h-full max-w-full object-contain rounded shadow-2xl border border-slate-800"
          />
        )}

        {activeTab === 'depth' && depthDataUrl && (
          <img
            src={depthDataUrl}
            alt="Monocular Depth Map"
            className="max-h-full max-w-full object-contain rounded shadow-2xl border border-slate-800"
          />
        )}

        {activeTab === 'elevation' && elevationDataUrl && (
          <img
            src={elevationDataUrl}
            alt="Digital Surface Model Elevation Map"
            className="max-h-full max-w-full object-contain rounded shadow-2xl border border-slate-800"
          />
        )}

        {activeTab === 'slope' && slopeDataUrl && (
          <img
            src={slopeDataUrl}
            alt="Topographic Slope Map"
            className="max-h-full max-w-full object-contain rounded shadow-2xl border border-slate-800"
          />
        )}

        {activeTab === 'compare' && elevationDataUrl && (
          <div className="relative max-h-full max-w-full aspect-square border border-slate-800 rounded shadow-2xl overflow-hidden">
            {/* Background: Elevation DSM */}
            <img src={elevationDataUrl} alt="DSM" className="w-full h-full object-cover" />
            {/* Foreground: Original RGB clipped */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${compareSplit}%`, borderRight: '2px solid #14b8a6' }}
            >
              <img
                src={session.dataUrl}
                alt="Original"
                className="absolute inset-0 max-w-none h-full"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            {/* Split labels */}
            <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-slate-900/80 rounded text-[10px] text-white">
              Original RGB
            </div>
            <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-slate-900/80 rounded text-[10px] text-teal-300">
              Generated DSM
            </div>
          </div>
        )}

        {/* Hover Coordinate Probe */}
        {hoverPixel && (
          <div className="absolute bottom-4 left-4 bg-slate-900/95 border border-slate-700 rounded px-3 py-1.5 text-xs font-mono shadow-xl pointer-events-none z-10 flex items-center gap-3">
            <span className="text-slate-400">[{hoverPixel.x}, {hoverPixel.y}]</span>
            <span className="text-teal-300 font-bold">{hoverPixel.label}</span>
          </div>
        )}

        {/* Legend Bar */}
        <div className="absolute bottom-4 right-4 bg-slate-900/90 border border-slate-800 rounded-lg p-2 text-xs flex flex-col gap-1 pointer-events-none shadow-xl">
          {activeTab === 'elevation' && (
            <div>
              <div className="text-[10px] text-slate-400 mb-1 flex justify-between">
                <span>Low ({session.elevationRange?.min ?? 0} {session.isCalibrated ? 'm' : 'rel'})</span>
                <span>High ({session.elevationRange?.max ?? 100} {session.isCalibrated ? 'm' : 'rel'})</span>
              </div>
              <div className="w-48 h-3 rounded-full bg-gradient-to-r from-[#1e4b78] via-[#8bc34a] via-[#d7b982] to-[#f5f5ff] border border-slate-700" />
            </div>
          )}

          {activeTab === 'slope' && (
            <div>
              <div className="text-[10px] text-slate-400 mb-1 flex justify-between">
                <span>0° (Gentle)</span>
                <span>15°</span>
                <span>30°+ (Steep)</span>
              </div>
              <div className="w-48 h-3 rounded-full bg-gradient-to-r from-[#2ecc71] via-[#f1c40f] via-[#e67e22] to-[#8e44ad] border border-slate-700" />
            </div>
          )}

          {activeTab === 'depth' && (
            <div>
              <div className="text-[10px] text-slate-400 mb-1 flex justify-between">
                <span>0.0 (Far/Depression)</span>
                <span>1.0 (Near/Elevated)</span>
              </div>
              <div className="w-48 h-3 rounded-full bg-gradient-to-r from-black via-purple-700 via-rose-500 to-yellow-200 border border-slate-700" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
