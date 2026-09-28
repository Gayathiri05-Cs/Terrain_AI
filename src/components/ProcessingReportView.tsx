import React from 'react';
import { Layers, Download, CheckCircle2, AlertTriangle, FileText, Globe, Cpu } from 'lucide-react';
import { ReconstructionSession } from '../types';

interface ProcessingReportViewProps {
  session: ReconstructionSession;
  onClose?: () => void;
}

export const ProcessingReportView: React.FC<ProcessingReportViewProps> = ({ session, onClose }) => {
  const downloadReportJson = () => {
    const reportData = {
      project: 'TerrainAI – Single Image to 3D Terrain Reconstruction',
      timestamp: new Date().toISOString(),
      input_image: {
        filename: session.filename,
        format: session.format,
        dimensions: { width: session.width, height: session.height },
        file_size_kb: session.fileSizeKb,
      },
      geospatial_metadata: session.geoMeta,
      depth_model: {
        name: 'Monocular Topographic Structural Inversion & Gradient Filter',
        architecture: 'Multi-scale luminance & morphological edge-preserving bilateral depth estimation',
        grid_resolution: `${session.dsm ? session.dsm[0].length : 96}x${session.dsm ? session.dsm.length : 96}`,
      },
      scale_calibration: {
        mode: session.calibrationMode,
        is_calibrated: session.isCalibrated,
        elevation_unit: session.isCalibrated ? 'meters' : 'relative_units',
        metadata: session.calibrationMeta,
      },
      surface_statistics: {
        elevation_range: session.elevationRange,
        slope_range_degrees: session.slopeRange,
      },
      accuracy_statement: session.isCalibrated
        ? 'Calibrated metric DSM with ground reference / GCP baseline.'
        : 'Relative DSM: Values represent relative topographic relief. No real-world metric claims made.',
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `terrainai_report_${session.filename}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-6 text-slate-100 space-y-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-950/60 border border-teal-700/50 flex items-center justify-center text-teal-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Technical Processing Audit Report</h2>
              <p className="text-xs text-slate-400">
                Full reconstruction lineage, sensor metadata, and calibration provenance.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={downloadReportJson}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow transition-all hover:scale-[1.02]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download JSON Report</span>
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 rounded-lg"
              >
                Close
              </button>
            )}
          </div>
        </div>

        {/* Audit Tables */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Input Sensor & Raster Info */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-teal-300 uppercase tracking-wider flex items-center gap-2">
              <Globe className="w-4 h-4" />
              <span>Input Image & Geospatial Tags</span>
            </h3>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-slate-800/80">
                <tr>
                  <td className="py-2 text-slate-400">Filename</td>
                  <td className="py-2 text-right font-medium text-white truncate max-w-[200px]">{session.filename}</td>
                </tr>
                <tr>
                  <td className="py-2 text-slate-400">Dimensions</td>
                  <td className="py-2 text-right font-mono text-slate-200">{session.width} × {session.height} px</td>
                </tr>
                <tr>
                  <td className="py-2 text-slate-400">Format</td>
                  <td className="py-2 text-right font-mono text-teal-300">{session.format}</td>
                </tr>
                <tr>
                  <td className="py-2 text-slate-400">Georeferenced</td>
                  <td className="py-2 text-right">
                    {session.geoMeta.isGeoreferenced ? (
                      <span className="text-emerald-400 font-semibold">Yes</span>
                    ) : (
                      <span className="text-slate-400">No (Relative Mode)</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 text-slate-400">CRS / EPSG</td>
                  <td className="py-2 text-right font-mono text-slate-300">{session.geoMeta.crs || 'None'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Card 2: AI & Depth Estimation Pipeline */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-teal-300 uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              <span>AI Depth & Surface Modeling</span>
            </h3>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-slate-800/80">
                <tr>
                  <td className="py-2 text-slate-400">Depth Engine</td>
                  <td className="py-2 text-right font-medium text-white">Monocular Topographic Estimator</td>
                </tr>
                <tr>
                  <td className="py-2 text-slate-400">Mesh Resolution</td>
                  <td className="py-2 text-right font-mono text-slate-200">
                    {session.dsm ? session.dsm[0].length : 96} × {session.dsm ? session.dsm.length : 96} vertices
                  </td>
                </tr>
                <tr>
                  <td className="py-2 text-slate-400">Calibration Mode</td>
                  <td className="py-2 text-right font-medium text-teal-300">
                    {session.calibrationMeta?.mode || 'Mode C · Relative DSM'}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 text-slate-400">Elevation Units</td>
                  <td className="py-2 text-right font-mono text-white">
                    {session.isCalibrated ? 'Meters (Real-world)' : 'Relative Units (0–100)'}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 text-slate-400">Elevation Bounds</td>
                  <td className="py-2 text-right font-mono text-slate-200">
                    {session.elevationRange?.min ?? 0} to {session.elevationRange?.max ?? 100} {session.isCalibrated ? 'm' : 'rel'}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 text-slate-400">Mean Surface Slope</td>
                  <td className="py-2 text-right font-mono text-amber-300">{session.slopeRange?.avg ?? 12}°</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Accuracy and Grounding Audit Statement */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2 text-xs">
          <span className="font-bold text-white uppercase tracking-wider block">
            Scientific Accuracy & Methodology Statement
          </span>
          <p className="text-slate-300 leading-relaxed">
            {session.isCalibrated
              ? 'This Digital Surface Model was scaled and calibrated against reference elevation data or ground control points. Metric units reflect the applied linear transformation. Topographic errors remain subject to monocular perspective distortion, solar incidence angle, and vegetation canopy thickness.'
              : 'This Digital Surface Model is uncalibrated. Output values represent normalized relative topography (0–100 units) and MUST NOT be interpreted as real-world meters or surveyed engineering elevations.'}
          </p>
        </div>

      </div>
    </div>
  );
};
