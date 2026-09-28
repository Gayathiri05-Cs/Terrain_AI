import React, { useRef, useState } from 'react';
import { UploadCloud, FileImage, CheckCircle, AlertCircle, Play, RotateCcw, MapPin, Globe, Sparkles } from 'lucide-react';
import { ReconstructionSession, GeospatialMetadata } from '../types';

interface UploadPanelProps {
  onFileUpload: (file: File) => void;
  onGenerateTerrain: () => void;
  onReset: () => void;
  session: ReconstructionSession | null;
  isUploading: boolean;
  isProcessing: boolean;
  onLoadDemo: (type: 'urban' | 'hilly' | 'sparse' | 'forest') => void;
}

export const UploadPanel: React.FC<UploadPanelProps> = ({
  onFileUpload,
  onGenerateTerrain,
  onReset,
  session,
  isUploading,
  isProcessing,
  onLoadDemo,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <div className="bg-slate-900 border-b border-slate-800 p-4 text-slate-200">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Drop Zone / Image Details */}
        {!session ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex-1 border-2 border-dashed rounded-xl p-4 flex flex-col sm:flex-row items-center justify-center gap-4 cursor-pointer transition-all ${
              isDragging
                ? 'border-teal-400 bg-teal-950/30'
                : 'border-slate-700 hover:border-slate-600 bg-slate-950/50 hover:bg-slate-950/80'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.tif,.tiff,.geotiff"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shrink-0">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div className="text-center sm:text-left">
              <span className="text-sm font-semibold text-white block">
                Upload Optical Aerial or Satellite Image
              </span>
              <span className="text-xs text-slate-400">
                Supports JPG, JPEG, PNG, TIFF, or GeoTIFF (up to 30MB)
              </span>
            </div>
          </div>
        ) : (
          /* Active Image Metadata Card */
          <div className="flex-1 bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-700 bg-slate-800 shrink-0">
                <img src={session.dataUrl} alt="Thumbnail" className="w-full h-full object-cover" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block truncate max-w-[220px]">
                  {session.filename}
                </span>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span>{session.width} × {session.height} px</span>
                  <span>·</span>
                  <span>{session.fileSizeKb} KB</span>
                  <span>·</span>
                  <span className="font-mono text-teal-300">{session.format}</span>
                </div>
              </div>
            </div>

            {/* Georeference Status Badge */}
            <div className="text-xs">
              {session.geoMeta.isGeoreferenced ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-teal-950/70 border border-teal-700/60 text-teal-300">
                  <Globe className="w-3.5 h-3.5 text-teal-400" />
                  <span className="font-semibold">{session.geoMeta.message}</span>
                  {session.geoMeta.crs && (
                    <span className="text-[10px] text-teal-400/80 font-mono">({session.geoMeta.crs})</span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700 text-slate-300">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>{session.geoMeta.message}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {!session ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow transition-all disabled:opacity-50"
              >
                Upload Image
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={onGenerateTerrain}
                disabled={isProcessing}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow-lg shadow-teal-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isProcessing ? 'Processing Terrain...' : 'Generate Terrain'}</span>
              </button>
              <button
                onClick={onReset}
                disabled={isProcessing}
                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
