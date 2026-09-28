import React, { useState } from 'react';
import { X, Download, FileCode, FileImage, Layers, Box, Check, Loader2 } from 'lucide-react';
import { ReconstructionSession } from '../types';
import { gridToDataUrl } from '../utils/colormaps';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: ReconstructionSession;
  exaggeration: number;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, session, exaggeration }) => {
  const [downloading, setDownloading] = useState<string | null>(null);

  if (!isOpen) return null;

  const downloadPng = (type: 'depth' | 'elevation' | 'slope') => {
    setDownloading(type);
    try {
      let dataUrl = '';
      if (type === 'depth' && session.normalizedDepth) {
        dataUrl = gridToDataUrl(session.normalizedDepth, 'inferno', 0, 1);
      } else if (type === 'elevation' && session.dsm) {
        dataUrl = gridToDataUrl(
          session.dsm,
          'terrain',
          session.elevationRange?.min ?? 0,
          session.elevationRange?.max ?? 100,
          true,
          10
        );
      } else if (type === 'slope' && session.slopeGrid) {
        dataUrl = gridToDataUrl(session.slopeGrid, 'slope', 0, 45);
      }

      if (!dataUrl) throw new Error('Data not available');

      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${session.filename.split('.')[0]}_${type}_map.png`;
      a.click();
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloading(null);
    }
  };

  const downloadObjMesh = async () => {
    setDownloading('obj');
    try {
      const response = await fetch('/api/export/obj', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.sessionId,
          exaggeration,
          step: 2,
        }),
      });

      if (!response.ok) throw new Error('OBJ export failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${session.filename.split('.')[0]}_terrain.obj`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('OBJ download error:', err);
    } finally {
      setDownloading(null);
    }
  };

  const downloadRawElevation = () => {
    setDownloading('raw');
    try {
      if (!session.dsm) return;
      // Export as CSV matrix
      const csvContent = session.dsm.map((row) => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${session.filename.split('.')[0]}_elevation_grid.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Raw elevation download error:', err);
    } finally {
      setDownloading(null);
    }
  };

  const downloadGeoTiffOrMeta = () => {
    setDownloading('geotiff');
    try {
      const exportMeta = {
        name: session.filename,
        georeferenced: session.geoMeta.isGeoreferenced,
        crs: session.geoMeta.crs || 'Unprojected',
        bounds: session.geoMeta.bounds,
        pixel_resolution: session.geoMeta.pixelResolution,
        elevation_units: session.isCalibrated ? 'meters' : 'relative_units',
        grid_width: session.dsm ? session.dsm[0].length : 0,
        grid_height: session.dsm ? session.dsm.length : 0,
        elevation_grid: session.dsm,
      };

      const blob = new Blob([JSON.stringify(exportMeta, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${session.filename.split('.')[0]}_dsm_geotiff_dataset.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('GeoTIFF download error:', err);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-teal-400" />
            <h2 className="text-base font-bold">Export Reconstruction Artifacts</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Export Options Grid */}
        <div className="p-6 space-y-3">
          <p className="text-xs text-slate-400 mb-4">
            Download standard GIS rasters, 3D meshes, and numerical datasets generated from this session.
          </p>

          <div className="space-y-2">
            {/* 3D Mesh OBJ */}
            <button
              onClick={downloadObjMesh}
              disabled={downloading === 'obj'}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-teal-500/50 hover:bg-slate-800/50 transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-teal-950 border border-teal-700/60 flex items-center justify-center text-teal-400 group-hover:bg-teal-500 group-hover:text-slate-950 transition-colors">
                  <Box className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">3D Terrain Mesh (.obj)</span>
                  <span className="text-[11px] text-slate-400">Wavefront OBJ with vertex UVs for Blender & GIS</span>
                </div>
              </div>
              {downloading === 'obj' ? <Loader2 className="w-4 h-4 animate-spin text-teal-400" /> : <Download className="w-4 h-4 text-slate-400 group-hover:text-white" />}
            </button>

            {/* Elevation DSM PNG */}
            <button
              onClick={() => downloadPng('elevation')}
              disabled={downloading === 'elevation'}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-teal-500/50 hover:bg-slate-800/50 transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
                  <FileImage className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Digital Surface Model (PNG)</span>
                  <span className="text-[11px] text-slate-400">Elevation colormap with contour overlays</span>
                </div>
              </div>
              {downloading === 'elevation' ? <Loader2 className="w-4 h-4 animate-spin text-teal-400" /> : <Download className="w-4 h-4 text-slate-400 group-hover:text-white" />}
            </button>

            {/* Monocular Depth Map PNG */}
            <button
              onClick={() => downloadPng('depth')}
              disabled={downloading === 'depth'}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-teal-500/50 hover:bg-slate-800/50 transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-950 border border-purple-700/60 flex items-center justify-center text-purple-400 group-hover:bg-purple-500 group-hover:text-slate-950 transition-colors">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Monocular Relative Depth Map (PNG)</span>
                  <span className="text-[11px] text-slate-400">Normalized [0.0–1.0] inverse disparity</span>
                </div>
              </div>
              {downloading === 'depth' ? <Loader2 className="w-4 h-4 animate-spin text-teal-400" /> : <Download className="w-4 h-4 text-slate-400 group-hover:text-white" />}
            </button>

            {/* Slope Map PNG */}
            <button
              onClick={() => downloadPng('slope')}
              disabled={downloading === 'slope'}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-teal-500/50 hover:bg-slate-800/50 transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-950 border border-amber-700/60 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
                  <FileImage className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Topographic Slope Map (PNG)</span>
                  <span className="text-[11px] text-slate-400">Degrees slope gradient with category ramps</span>
                </div>
              </div>
              {downloading === 'slope' ? <Loader2 className="w-4 h-4 animate-spin text-teal-400" /> : <Download className="w-4 h-4 text-slate-400 group-hover:text-white" />}
            </button>

            {/* Raw Elevation Matrix CSV */}
            <button
              onClick={downloadRawElevation}
              disabled={downloading === 'raw'}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-teal-500/50 hover:bg-slate-800/50 transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-950 border border-blue-700/60 flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-slate-950 transition-colors">
                  <FileCode className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Raw Numerical Elevation Matrix (CSV)</span>
                  <span className="text-[11px] text-slate-400">Floating-point 2D elevation grid array</span>
                </div>
              </div>
              {downloading === 'raw' ? <Loader2 className="w-4 h-4 animate-spin text-teal-400" /> : <Download className="w-4 h-4 text-slate-400 group-hover:text-white" />}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white rounded-lg hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
