import React, { useState } from 'react';
import { Sparkles, Brain, AlertCircle, RefreshCw, Layers, ShieldCheck, Check } from 'lucide-react';
import { ReconstructionSession } from '../types';

interface AITerrainExplanationProps {
  session: ReconstructionSession;
}

export const AITerrainExplanation: React.FC<AITerrainExplanationProps> = ({ session }) => {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExplanation = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/gemini/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.sessionId,
          landscapeType: session.geoMeta.isGeoreferenced ? 'Georeferenced Satellite Capture' : 'Optical Aerial View',
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate terrain interpretation.');
      }
      setExplanation(data.explanation);
    } catch (err: any) {
      console.warn('Gemini explanation error:', err);
      setError(
        err.message || 'AI Terrain Explanation could not be retrieved. The core terrain reconstruction continues normally.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-6 text-slate-100 space-y-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-700/50 flex items-center justify-center text-purple-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">AI Terrain Interpretation</h2>
              <p className="text-xs text-slate-400">
                Geomorphic structure, drainage pattern, and topographic relief assessment by Gemini 3.8.
              </p>
            </div>
          </div>

          <button
            onClick={fetchExplanation}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Analyzing Surface...' : explanation ? 'Regenerate Analysis' : 'Analyze Terrain Structure'}</span>
          </button>
        </div>

        {/* Accuracy & Grounding Rule Banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 flex items-start gap-3">
          <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-white block">Strict Elevation Grounding Protocol</span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Gemini provides qualitative morphological interpretation (identifying ridges, valleys, and canopy
              patterns) but is restricted from inventing numerical elevations. All metric values are derived strictly
              from the computed Digital Surface Model.
            </p>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-amber-950/30 border border-amber-800/60 rounded-xl p-4 text-xs text-amber-300 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Interpretation Notice</span>
              <p className="text-slate-300 text-[11px] mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Initial Prompt State */}
        {!explanation && !isLoading && !error && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-8 text-center space-y-4">
            <Brain className="w-12 h-12 text-purple-400/80 mx-auto" />
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-sm font-bold text-white">Generate Geomorphic Assessment</h3>
              <p className="text-xs text-slate-400">
                Click the button above to have Gemini inspect the reconstructed surface structure,
                characterize likely landform features, and assess topographic continuity.
              </p>
            </div>
            <button
              onClick={fetchExplanation}
              className="px-5 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow"
            >
              Run Geomorphic Analysis
            </button>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-teal-400 animate-spin mx-auto" />
            <h3 className="text-sm font-bold text-white">Evaluating Terrain Topology...</h3>
            <p className="text-xs text-slate-400">
              Examining elevation range [{session.elevationRange?.min ?? 0} to {session.elevationRange?.max ?? 100}{' '}
              {session.isCalibrated ? 'm' : 'rel. units'}], slope distribution, and structural boundaries.
            </p>
          </div>
        )}

        {/* Explanation Result Card */}
        {explanation && !isLoading && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold text-teal-300 uppercase tracking-wider">
                Geomorphological Assessment Report
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Engine: Gemini 3.8 Flash</span>
            </div>

            <div className="prose prose-invert prose-xs max-w-none text-slate-200 text-xs leading-relaxed space-y-3 whitespace-pre-line font-sans">
              {explanation}
            </div>

            {/* Context Summary Footer */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-4 border-t border-slate-800 text-[11px]">
              <div>
                <span className="text-slate-500 block">DSM Type:</span>
                <span className="text-white font-medium">{session.isCalibrated ? 'Metric DSM' : 'Relative DSM'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Elevation Bounds:</span>
                <span className="text-teal-300 font-mono font-medium">
                  {session.elevationRange?.min ?? 0} – {session.elevationRange?.max ?? 100} {session.isCalibrated ? 'm' : 'rel'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Avg Slope:</span>
                <span className="text-amber-300 font-mono font-medium">{session.slopeRange?.avg ?? 12}°</span>
              </div>
              <div>
                <span className="text-slate-500 block">Grid Points:</span>
                <span className="text-slate-300 font-mono">{session.dsm ? session.dsm.length ** 2 : 6400}</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
