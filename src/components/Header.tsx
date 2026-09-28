import React from 'react';
import { Mountain, RotateCcw, Compass, HelpCircle, Layers, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { ReconstructionSession } from '../types';

interface HeaderProps {
  session: ReconstructionSession | null;
  onReset: () => void;
  onLoadDemo: (type: 'urban' | 'hilly' | 'sparse' | 'forest') => void;
  onShowLanding: () => void;
  onShowReport: () => void;
  isLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  session,
  onReset,
  onLoadDemo,
  onShowLanding,
  onShowReport,
  isLoading,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-md z-30 select-none">
      {/* Brand & Subtitle */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-inner">
          <Mountain className="w-5 h-5 text-slate-950" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold tracking-tight text-white">TerrainAI</h1>
            <span className="text-xs text-slate-400 font-mono hidden sm:inline">v1.2-stable</span>
          </div>
          <p className="text-xs text-slate-400 leading-tight">
            Single-View RGB Image to 3D Terrain Reconstruction
          </p>
        </div>
      </div>

      {/* Accuracy Status Notice Badge */}
      <div className="flex items-center gap-2 text-xs">
        {session ? (
          session.isCalibrated ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/80 border border-emerald-700/60 text-emerald-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold">Calibrated DSM</span>
              <span className="text-emerald-400/80">({session.elevationRange?.min ?? 0}m – {session.elevationRange?.max ?? 0}m)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/70 border border-amber-700/50 text-amber-300">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold">Relative Elevation</span>
              <span className="text-amber-400/70 font-mono">(0–100 rel. units)</span>
            </div>
          )
        ) : (
          <div className="flex items-center gap-1.5 text-slate-400 text-xs px-2 py-0.5">
            <Compass className="w-3.5 h-3.5 text-slate-500" />
            <span>Ready for image input</span>
          </div>
        )}
      </div>

      {/* Quick Actions & Demo Presets */}
      <div className="flex items-center gap-2">
        {/* Demo Preset Dropdown / Buttons */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded border border-slate-700">
          <span className="text-[11px] text-slate-400 px-2 font-medium">Demo:</span>
          <button
            onClick={() => onLoadDemo('hilly')}
            disabled={isLoading}
            className="px-2 py-1 text-xs font-medium rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors disabled:opacity-50"
            title="Load Mountainous Terrain Demo"
          >
            Mountain
          </button>
          <button
            onClick={() => onLoadDemo('urban')}
            disabled={isLoading}
            className="px-2 py-1 text-xs font-medium rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors disabled:opacity-50"
            title="Load Urban Metropolitan Demo"
          >
            Urban
          </button>
          <button
            onClick={() => onLoadDemo('forest')}
            disabled={isLoading}
            className="px-2 py-1 text-xs font-medium rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors disabled:opacity-50"
            title="Load Forest Canopy Demo"
          >
            Forest
          </button>
          <button
            onClick={() => onLoadDemo('sparse')}
            disabled={isLoading}
            className="px-2 py-1 text-xs font-medium rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors disabled:opacity-50"
            title="Load Desert Dune Demo"
          >
            Desert
          </button>
        </div>

        {/* Audit Report Button */}
        {session && (
          <button
            onClick={onShowReport}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded border border-slate-700 transition-colors"
            title="View Full Technical Processing Report"
          >
            <Layers className="w-3.5 h-3.5 text-teal-400" />
            <span className="hidden md:inline">Report</span>
          </button>
        )}

        {/* Landing/Overview */}
        <button
          onClick={onShowLanding}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Overview & Architecture Pipeline"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Reset */}
        {session && (
          <button
            onClick={onReset}
            disabled={isLoading}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-rose-950/50 hover:bg-rose-900/70 text-rose-300 border border-rose-800/60 rounded transition-colors disabled:opacity-50"
            title="Reset current session"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>
    </header>
  );
};
