import React, { useState } from 'react';
import { X, Sliders, ShieldCheck, MapPin, Plus, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { GCPPoint, CalibrationMode, ReconstructionSession } from '../types';

interface CalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: ReconstructionSession;
  onApplyCalibration: (mode: CalibrationMode, data: any) => void;
  isProcessing: boolean;
}

export const CalibrationModal: React.FC<CalibrationModalProps> = ({
  isOpen,
  onClose,
  session,
  onApplyCalibration,
  isProcessing,
}) => {
  const [selectedMode, setSelectedMode] = useState<CalibrationMode>(session.calibrationMode || 'mode_c_relative');

  // Mode A: DEM Bounds or parameters
  const [refDemMin, setRefDemMin] = useState<number>(session.elevationRange?.min ?? 100);
  const [refDemMax, setRefDemMax] = useState<number>(session.elevationRange?.max ?? 850);

  // Mode B: GCPs
  const [gcps, setGcps] = useState<GCPPoint[]>([
    { id: '1', pixelX: Math.round(session.width * 0.2), pixelY: Math.round(session.height * 0.3), elevationM: 145.0, label: 'Valley Base Point' },
    { id: '2', pixelX: Math.round(session.width * 0.8), pixelY: Math.round(session.height * 0.7), elevationM: 520.0, label: 'Summit Ridge Benchmark' },
  ]);

  if (!isOpen) return null;

  const handleAddGcp = () => {
    const newId = (gcps.length + 1).toString();
    setGcps([
      ...gcps,
      {
        id: newId,
        pixelX: Math.round(session.width * 0.5),
        pixelY: Math.round(session.height * 0.5),
        elevationM: 300.0,
        label: `GCP #${newId}`,
      },
    ]);
  };

  const handleRemoveGcp = (id: string) => {
    if (gcps.length <= 2) {
      alert('A minimum of 2 Ground Control Points are required for scale and offset calibration.');
      return;
    }
    setGcps(gcps.filter((g) => g.id !== id));
  };

  const handleGcpChange = (id: string, field: keyof GCPPoint, value: any) => {
    setGcps(
      gcps.map((g) => {
        if (g.id === id) {
          return { ...g, [field]: value };
        }
        return g;
      })
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMode === 'mode_b_gcp') {
      onApplyCalibration('mode_b_gcp', { gcps });
    } else if (selectedMode === 'mode_a_dem') {
      onApplyCalibration('mode_a_dem', { referenceDemMin: refDemMin, referenceDemMax: refDemMax });
    } else {
      onApplyCalibration('mode_c_relative', {});
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-teal-400" />
            <h2 className="text-base font-bold">Scale & Elevation Calibration</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {/* Mode Selector */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Select Calibration Mode
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedMode('mode_c_relative')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  selectedMode === 'mode_c_relative'
                    ? 'border-amber-500 bg-amber-950/30 text-amber-200'
                    : 'border-slate-800 bg-slate-950/50 hover:bg-slate-800/60 text-slate-400'
                }`}
              >
                <span className="font-bold text-xs">Mode C · Relative</span>
                <span className="text-[11px] text-slate-400 mt-1">Standard JPG/PNG uncalibrated (0–100 units)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMode('mode_a_dem')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  selectedMode === 'mode_a_dem'
                    ? 'border-teal-500 bg-teal-950/30 text-teal-200'
                    : 'border-slate-800 bg-slate-950/50 hover:bg-slate-800/60 text-slate-400'
                }`}
              >
                <span className="font-bold text-xs">Mode A · DEM Calib</span>
                <span className="text-[11px] text-slate-400 mt-1">Reference elevation regression fit</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMode('mode_b_gcp')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  selectedMode === 'mode_b_gcp'
                    ? 'border-emerald-500 bg-emerald-950/30 text-emerald-200'
                    : 'border-slate-800 bg-slate-950/50 hover:bg-slate-800/60 text-slate-400'
                }`}
              >
                <span className="font-bold text-xs">Mode B · GCPs</span>
                <span className="text-[11px] text-slate-400 mt-1">Surveyed Ground Control Points</span>
              </button>
            </div>
          </div>

          {/* Mode C View */}
          {selectedMode === 'mode_c_relative' && (
            <div className="bg-amber-950/20 border border-amber-800/40 rounded-xl p-4 text-xs text-amber-300 space-y-2">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="w-4 h-4" />
                <span>Relative Elevation Mode</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Metric elevation calibration is unavailable because no reference elevation data or ground control
                points have been supplied. The output will be displayed as <strong>Relative Elevation</strong> ranging
                from 0 to 100 normalized units.
              </p>
            </div>
          )}

          {/* Mode A View */}
          {selectedMode === 'mode_a_dem' && (
            <div className="space-y-4">
              <div className="bg-teal-950/20 border border-teal-800/40 rounded-xl p-4 text-xs text-teal-300 space-y-2">
                <div className="flex items-center gap-1.5 font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Reference DEM Scale Calibration</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Fit linear regression Z = scale · D + offset against known reference elevation
                  extremes from a paired regional DEM dataset.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-300 block mb-1">Reference Min Elevation (m)</label>
                  <input
                    type="number"
                    value={refDemMin}
                    onChange={(e) => setRefDemMin(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Reference Max Elevation (m)</label>
                  <input
                    type="number"
                    value={refDemMax}
                    onChange={(e) => setRefDemMax(parseFloat(e.target.value) || 100)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Mode B View */}
          {selectedMode === 'mode_b_gcp' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  Ground Control Points (GCPs): {gcps.length} active
                </span>
                <button
                  type="button"
                  onClick={handleAddGcp}
                  className="flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add GCP</span>
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {gcps.map((gcp, idx) => (
                  <div
                    key={gcp.id}
                    className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg flex items-center gap-2 text-xs"
                  >
                    <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="grid grid-cols-3 gap-2 flex-1">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Pixel X (0–{session.width})</span>
                        <input
                          type="number"
                          value={gcp.pixelX}
                          onChange={(e) => handleGcpChange(gcp.id, 'pixelX', parseInt(e.target.value) || 0)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-white font-mono text-[11px]"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Pixel Y (0–{session.height})</span>
                        <input
                          type="number"
                          value={gcp.pixelY}
                          onChange={(e) => handleGcpChange(gcp.id, 'pixelY', parseInt(e.target.value) || 0)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-white font-mono text-[11px]"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Known Elev (m)</span>
                        <input
                          type="number"
                          value={gcp.elevationM}
                          onChange={(e) => handleGcpChange(gcp.id, 'elevationM', parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-white font-mono text-[11px]"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveGcp(gcp.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white rounded-lg hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="px-5 py-2 text-xs font-bold text-slate-950 bg-teal-500 hover:bg-teal-400 rounded-lg shadow disabled:opacity-50"
            >
              {isProcessing ? 'Applying...' : 'Apply Calibration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
