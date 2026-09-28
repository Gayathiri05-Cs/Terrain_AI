import React from 'react';
import { CheckCircle2, Loader2, Circle } from 'lucide-react';

export const STAGES = [
  { id: 1, label: 'Image uploaded' },
  { id: 2, label: 'Image preprocessing' },
  { id: 3, label: 'AI depth estimation' },
  { id: 4, label: 'Depth normalization' },
  { id: 5, label: 'Scale calibration' },
  { id: 6, label: 'DSM generation' },
  { id: 7, label: '3D mesh generation' },
  { id: 8, label: 'Rendering complete' },
];

interface ProcessingProgressProps {
  currentStage: number; // 1 to 8
  isProcessing: boolean;
}

export const ProcessingProgress: React.FC<ProcessingProgressProps> = ({ currentStage, isProcessing }) => {
  return (
    <div className="w-full bg-slate-900 border-b border-slate-800 px-4 py-3 select-none">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1 scrollbar-thin">
          {STAGES.map((s, idx) => {
            const isCompleted = currentStage > s.id;
            const isCurrent = currentStage === s.id && isProcessing;
            const isUpcoming = currentStage < s.id;

            return (
              <div key={s.id} className="flex items-center gap-1.5 flex-1 min-w-[110px]">
                {/* Step indicator */}
                <div
                  className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0 transition-colors ${
                    isCompleted
                      ? 'bg-teal-500 text-slate-950'
                      : isCurrent
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-400'
                      : 'bg-slate-800 text-slate-500 border border-slate-700'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : isCurrent ? (
                    <Loader2 className="w-3 h-3 animate-spin text-teal-400" />
                  ) : (
                    <span>{s.id}</span>
                  )}
                </div>

                {/* Step label */}
                <span
                  className={`text-[11px] truncate whitespace-nowrap ${
                    isCompleted
                      ? 'text-slate-200 font-medium'
                      : isCurrent
                      ? 'text-teal-300 font-semibold'
                      : 'text-slate-500'
                  }`}
                >
                  {s.label}
                </span>

                {/* Connecting bar */}
                {idx < STAGES.length - 1 && (
                  <div
                    className={`h-[2px] flex-1 mx-1 rounded-full ${
                      isCompleted ? 'bg-teal-500/80' : 'bg-slate-800'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
