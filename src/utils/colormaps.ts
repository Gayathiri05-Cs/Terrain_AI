/**
 * Color maps and rendering utilities for GIS remote sensing data
 */

export type ColormapName = 'terrain' | 'turbo' | 'viridis' | 'inferno' | 'greyscale' | 'slope';

// Interpolate RGB
function interpolateRgb(c1: [number, number, number], c2: [number, number, number], t: number): [number, number, number] {
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t),
  ];
}

// Sample multi-stop gradient
function sampleGradient(stops: { t: number; color: [number, number, number] }[], t: number): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, t));
  for (let i = 0; i < stops.length - 1; i++) {
    if (clamped >= stops[i].t && clamped <= stops[i + 1].t) {
      const localT = (clamped - stops[i].t) / (stops[i + 1].t - stops[i].t);
      return interpolateRgb(stops[i].color, stops[i + 1].color, localT);
    }
  }
  return stops[stops.length - 1].color;
}

export function getColor(val: number, cmap: ColormapName): [number, number, number] {
  const t = Math.max(0, Math.min(1, val));

  if (cmap === 'greyscale') {
    const v = Math.round(t * 255);
    return [v, v, v];
  }

  if (cmap === 'slope') {
    // val is normalized slope or degrees: 0..45+
    // Green (0-5 deg) -> Yellow (5-15 deg) -> Orange (15-30 deg) -> Red/Purple (>30 deg)
    const slopeStops: { t: number; color: [number, number, number] }[] = [
      { t: 0.0, color: [46, 204, 113] },   // Gentle (Emerald)
      { t: 0.2, color: [241, 196, 15] },   // Moderate (Yellow)
      { t: 0.5, color: [230, 126, 34] },   // Steep (Orange)
      { t: 0.8, color: [231, 76, 60] },    // Precipitous (Red)
      { t: 1.0, color: [142, 68, 173] },   // Cliff (Purple)
    ];
    return sampleGradient(slopeStops, t);
  }

  if (cmap === 'terrain') {
    // Water -> Lowland green -> Highland beige -> Rocky brown -> Snow white
    const terrainStops: { t: number; color: [number, number, number] }[] = [
      { t: 0.0, color: [30, 75, 120] },   // Deep depression / water
      { t: 0.15, color: [46, 125, 50] },  // Lowland forest
      { t: 0.4, color: [139, 195, 74] },  // Grassland
      { t: 0.65, color: [215, 185, 130] },// Highland arid/sand
      { t: 0.85, color: [120, 85, 60] },  // Rock / Escarpment
      { t: 1.0, color: [245, 245, 255] }, // Peak snow
    ];
    return sampleGradient(terrainStops, t);
  }

  if (cmap === 'turbo') {
    const turboStops: { t: number; color: [number, number, number] }[] = [
      { t: 0.0, color: [48, 18, 59] },
      { t: 0.25, color: [70, 134, 251] },
      { t: 0.5, color: [27, 229, 181] },
      { t: 0.75, color: [251, 185, 56] },
      { t: 1.0, color: [122, 4, 3] },
    ];
    return sampleGradient(turboStops, t);
  }

  if (cmap === 'viridis') {
    const viridisStops: { t: number; color: [number, number, number] }[] = [
      { t: 0.0, color: [68, 1, 84] },
      { t: 0.25, color: [59, 82, 139] },
      { t: 0.5, color: [33, 145, 140] },
      { t: 0.75, color: [94, 201, 98] },
      { t: 1.0, color: [253, 231, 37] },
    ];
    return sampleGradient(viridisStops, t);
  }

  // Default: inferno
  const infernoStops: { t: number; color: [number, number, number] }[] = [
    { t: 0.0, color: [0, 0, 4] },
    { t: 0.25, color: [87, 16, 110] },
    { t: 0.5, color: [187, 55, 84] },
    { t: 0.75, color: [249, 142, 9] },
    { t: 1.0, color: [252, 255, 164] },
  ];
  return sampleGradient(infernoStops, t);
}

/**
 * Renders a 2D matrix of numbers into an offscreen HTMLCanvasElement and returns a Data URL.
 */
export function gridToDataUrl(
  grid: number[][],
  cmap: ColormapName = 'terrain',
  minVal?: number,
  maxVal?: number,
  showContours: boolean = false,
  numContours: number = 8
): string {
  const h = grid.length;
  const w = grid[0].length;

  let min = minVal !== undefined ? minVal : Infinity;
  let max = maxVal !== undefined ? maxVal : -Infinity;

  if (minVal === undefined || maxVal === undefined) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const v = grid[y][x];
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }
  }

  const span = max - min || 1;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const imgData = ctx.createImageData(w, h);
  const data = imgData.data;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const v = (grid[y][x] - min) / span;
      const [r, g, b] = getColor(v, cmap);

      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // Optional contour line overlay
  if (showContours && numContours > 0) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 0.8;
    const interval = span / numContours;

    for (let c = 1; c < numContours; c++) {
      const contourVal = min + c * interval;
      ctx.beginPath();
      for (let y = 0; y < h - 1; y++) {
        for (let x = 0; x < w - 1; x++) {
          const v00 = grid[y][x];
          const v10 = grid[y][x + 1];
          const v01 = grid[y + 1][x];
          if ((v00 < contourVal && v10 >= contourVal) || (v00 >= contourVal && v10 < contourVal)) {
            ctx.moveTo(x + 0.5, y);
            ctx.lineTo(x + 0.5, y + 1);
          }
          if ((v00 < contourVal && v01 >= contourVal) || (v00 >= contourVal && v01 < contourVal)) {
            ctx.moveTo(x, y + 0.5);
            ctx.lineTo(x + 1, y + 0.5);
          }
        }
      }
      ctx.stroke();
    }
  }

  return canvas.toDataURL('image/png');
}
