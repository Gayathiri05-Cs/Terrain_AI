import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  RotateCcw,
  Maximize2,
  Minimize2,
  Grid as GridIcon,
  Ruler,
  Eye,
  Sliders,
  Compass as CompassIcon,
  MousePointer,
  Crosshair,
  Info,
  Waves,
} from 'lucide-react';
import { ReconstructionSession, MeasurementResult } from '../types';

interface TerrainViewer3DProps {
  session: ReconstructionSession;
  exaggeration: number;
  onExaggerationChange: (val: number) => void;
  meshResolution: number;
  onMeshResolutionChange: (val: number) => void;
  onMeasureCompleted?: (measure: MeasurementResult | null) => void;
  waterLevel?: number | null;
  showWaterSurface?: boolean;
  highlightLowLying?: boolean;
}

export const TerrainViewer3D: React.FC<TerrainViewer3DProps> = ({
  session,
  exaggeration,
  onExaggerationChange,
  meshResolution,
  onMeshResolutionChange,
  onMeasureCompleted,
  waterLevel,
  showWaterSurface = true,
  highlightLowLying,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Three.js internal references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const terrainMeshRef = useRef<THREE.Mesh | null>(null);
  const waterMeshRef = useRef<THREE.Mesh | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const axesHelperRef = useRef<THREE.AxesHelper | null>(null);
  const measureLineRef = useRef<THREE.Line | null>(null);
  const markersRef = useRef<THREE.Mesh[]>([]);

  // UI States
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showTexture, setShowTexture] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [measureMode, setMeasureMode] = useState<boolean>(false);

  // Hover Probe State
  const [hoverData, setHoverData] = useState<{
    x: number;
    y: number;
    elevation: number;
    slope: number;
    unit: string;
    isFlooded?: boolean;
    floodDepth?: number;
  } | null>(null);

  // Measurement Points
  const [measurePoints, setMeasurePoints] = useState<{
    p1: { x: number; y: number; worldX: number; worldY: number; worldZ: number; elev: number } | null;
    p2: { x: number; y: number; worldX: number; worldY: number; worldZ: number; elev: number } | null;
  }>({ p1: null, p2: null });

  const [activeMeasurement, setActiveMeasurement] = useState<MeasurementResult | null>(null);

  // Setup Three.js scene
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1d);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    camera.position.set(0, 75, 120);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // prevent going beneath terrain
    controls.minDistance = 10;
    controls.maxDistance = 600;
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff6e5, 1.2);
    sunLight.position.set(100, 150, 80);
    sunLight.castShadow = true;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0xa5c4d4, 0.4);
    fillLight.position.set(-80, 60, -60);
    scene.add(fillLight);

    // Grid & Axes Helpers
    const grid = new THREE.GridHelper(120, 24, 0x14b8a6, 0x1e293b);
    grid.position.y = -0.1;
    scene.add(grid);
    gridHelperRef.current = grid;

    const axes = new THREE.AxesHelper(20);
    axes.position.set(-55, 0.5, 55);
    scene.add(axes);
    axesHelperRef.current = axes;

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  // Update Terrain Geometry & Texture whenever DSM or settings change
  useEffect(() => {
    if (!sceneRef.current || !session.dsm) return;

    const scene = sceneRef.current;

    // Remove existing terrain mesh
    if (terrainMeshRef.current) {
      scene.remove(terrainMeshRef.current);
      terrainMeshRef.current.geometry.dispose();
      if (Array.isArray(terrainMeshRef.current.material)) {
        terrainMeshRef.current.material.forEach((m) => m.dispose());
      } else {
        terrainMeshRef.current.material.dispose();
      }
      terrainMeshRef.current = null;
    }

    const dsm = session.dsm;
    const gridH = dsm.length;
    const gridW = dsm[0].length;

    const segW = Math.min(meshResolution, gridW - 1);
    const segH = Math.min(meshResolution, gridH - 1);

    const terrainSize = 100;
    const geometry = new THREE.PlaneGeometry(terrainSize, terrainSize, segW, segH);
    geometry.rotateX(-Math.PI / 2); // Lay flat on XZ plane

    const pos = geometry.attributes.position;
    const vertexCount = pos.count;

    // Find min and max for height normalization in 3D
    let minE = Infinity;
    let maxE = -Infinity;
    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        const v = dsm[y][x];
        if (v < minE) minE = v;
        if (v > maxE) maxE = v;
      }
    }
    const elevSpan = maxE - minE || 1;

    // Populate Y elevation for each vertex
    for (let i = 0; i < vertexCount; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);

      // Map XZ [-terrainSize/2, terrainSize/2] to grid indices [0, gridW-1], [0, gridH-1]
      const u = (vx + terrainSize / 2) / terrainSize;
      const v = (vz + terrainSize / 2) / terrainSize;

      const gx = Math.min(gridW - 1, Math.max(0, Math.round(u * (gridW - 1))));
      const gy = Math.min(gridH - 1, Math.max(0, Math.round(v * (gridH - 1))));

      const elevValue = dsm[gy][gx];
      // Height scaling: base relief span of 18 units * exaggeration
      const normalizedH = (elevValue - minE) / elevSpan;
      const vy = normalizedH * 22 * exaggeration;

      pos.setY(i, vy);
    }

    geometry.computeVertexNormals();

    // Material & Texture
    let material: THREE.Material;

    if (showTexture && session.dataUrl) {
      const textureLoader = new THREE.TextureLoader();
      const texture = textureLoader.load(session.dataUrl, () => {
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
      });
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.minFilter = THREE.LinearMipmapLinearFilter;

      material = new THREE.MeshStandardMaterial({
        map: texture,
        wireframe,
        roughness: 0.8,
        metalness: 0.1,
        side: THREE.DoubleSide,
      });
    } else {
      // Color-shaded topographic material
      material = new THREE.MeshStandardMaterial({
        color: 0x14b8a6,
        wireframe,
        roughness: 0.7,
        metalness: 0.2,
        side: THREE.DoubleSide,
      });
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    scene.add(mesh);
    terrainMeshRef.current = mesh;
  }, [session, exaggeration, meshResolution, wireframe, showTexture]);

  // Update Grid / Axes Visibility
  useEffect(() => {
    if (gridHelperRef.current) gridHelperRef.current.visible = showGrid;
    if (axesHelperRef.current) axesHelperRef.current.visible = showGrid;
  }, [showGrid]);

  // Update 3D Water Surface Plane based on waterLevel
  useEffect(() => {
    if (!sceneRef.current || !session.dsm) return;
    const scene = sceneRef.current;

    if (waterLevel === undefined || waterLevel === null || showWaterSurface === false) {
      if (waterMeshRef.current) {
        waterMeshRef.current.visible = false;
      }
      return;
    }

    const dsm = session.dsm;
    let minE = Infinity;
    let maxE = -Infinity;
    for (let y = 0; y < dsm.length; y++) {
      for (let x = 0; x < dsm[0].length; x++) {
        const v = dsm[y][x];
        if (v < minE) minE = v;
        if (v > maxE) maxE = v;
      }
    }
    const elevSpan = Math.max(1, maxE - minE);
    const terrainSize = 100;

    // Normalization to 3D Y coordinate
    const normalizedWater = (waterLevel - minE) / elevSpan;
    const waterY = normalizedWater * 22 * exaggeration;

    if (!waterMeshRef.current) {
      const waterGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, 16, 16);
      waterGeo.rotateX(-Math.PI / 2);
      const waterMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7, // sky-600
        transparent: true,
        opacity: 0.65,
        roughness: 0.1,
        metalness: 0.3,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const waterMesh = new THREE.Mesh(waterGeo, waterMat);
      waterMesh.position.y = waterY;
      scene.add(waterMesh);
      waterMeshRef.current = waterMesh;
    } else {
      waterMeshRef.current.position.y = waterY;
      waterMeshRef.current.visible = true;
    }
  }, [session.dsm, waterLevel, showWaterSurface, exaggeration]);

  // Handle Raycasting for Mouse Hover & Measurement Clicks
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current || !cameraRef.current || !terrainMeshRef.current || !session.dsm) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), cameraRef.current);

      const intersects = raycaster.intersectObject(terrainMeshRef.current);
      if (intersects.length > 0) {
        const hit = intersects[0];
        const point = hit.point;
        const terrainSize = 100;

        const u = Math.min(1, Math.max(0, (point.x + terrainSize / 2) / terrainSize));
        const v = Math.min(1, Math.max(0, (point.z + terrainSize / 2) / terrainSize));

        const gridH = session.dsm.length;
        const gridW = session.dsm[0].length;
        const gx = Math.min(gridW - 1, Math.max(0, Math.round(u * (gridW - 1))));
        const gy = Math.min(gridH - 1, Math.max(0, Math.round(v * (gridH - 1))));

        const elev = session.dsm[gy][gx];
        const slope = session.slopeGrid ? session.slopeGrid[gy][gx] : 0;

        const isFlooded = waterLevel !== undefined && waterLevel !== null && elev <= waterLevel;
        const floodDepth = isFlooded ? Number((waterLevel - elev).toFixed(1)) : 0;

        setHoverData({
          x: gx,
          y: gy,
          elevation: Number(elev.toFixed(1)),
          slope: Number(slope.toFixed(1)),
          unit: session.isCalibrated ? 'm' : 'rel. units',
          isFlooded,
          floodDepth,
        });
      } else {
        setHoverData(null);
      }
    },
    [session, waterLevel]
  );

  // Handle Measurement Clicks on 3D Surface
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!measureMode || !canvasRef.current || !cameraRef.current || !terrainMeshRef.current || !session.dsm) {
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), cameraRef.current);

    const intersects = raycaster.intersectObject(terrainMeshRef.current);
    if (intersects.length > 0) {
      const hit = intersects[0];
      const pt = hit.point;
      const terrainSize = 100;

      const u = Math.min(1, Math.max(0, (pt.x + terrainSize / 2) / terrainSize));
      const v = Math.min(1, Math.max(0, (pt.z + terrainSize / 2) / terrainSize));

      const gridH = session.dsm.length;
      const gridW = session.dsm[0].length;
      const gx = Math.min(gridW - 1, Math.max(0, Math.round(u * (gridW - 1))));
      const gy = Math.min(gridH - 1, Math.max(0, Math.round(v * (gridH - 1))));
      const elev = session.dsm[gy][gx];

      if (!measurePoints.p1 || (measurePoints.p1 && measurePoints.p2)) {
        // Set Point A
        setMeasurePoints({
          p1: { x: gx, y: gy, worldX: pt.x, worldY: pt.y + 0.5, worldZ: pt.z, elev },
          p2: null,
        });
        clearMeasureGraphics();
        drawMarker(pt.x, pt.y + 0.5, pt.z, 0x14b8a6);
        setActiveMeasurement(null);
        if (onMeasureCompleted) onMeasureCompleted(null);
      } else {
        // Set Point B and compute distance & slope profile
        const p1 = measurePoints.p1;
        const p2 = { x: gx, y: gy, worldX: pt.x, worldY: pt.y + 0.5, worldZ: pt.z, elev };
        setMeasurePoints({ p1, p2 });
        drawMarker(pt.x, pt.y + 0.5, pt.z, 0xf59e0b);
        drawLine(p1.worldX, p1.worldY, p1.worldZ, pt.x, pt.y + 0.5, pt.z);

        // Calculate profile
        computeProfileMeasurement(p1, p2);
      }
    }
  };

  const drawMarker = (x: number, y: number, z: number, color: number) => {
    if (!sceneRef.current) return;
    const sphereGeo = new THREE.SphereGeometry(1.2, 16, 16);
    const sphereMat = new THREE.MeshBasicMaterial({ color });
    const marker = new THREE.Mesh(sphereGeo, sphereMat);
    marker.position.set(x, y, z);
    sceneRef.current.add(marker);
    markersRef.current.push(marker);
  };

  const drawLine = (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number) => {
    if (!sceneRef.current) return;
    const points = [new THREE.Vector3(x1, y1, z1), new THREE.Vector3(x2, y2, z2)];
    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, linewidth: 3 });
    const line = new THREE.Line(lineGeo, lineMat);
    sceneRef.current.add(line);
    measureLineRef.current = line;
  };

  const clearMeasureGraphics = () => {
    if (!sceneRef.current) return;
    markersRef.current.forEach((m) => {
      sceneRef.current?.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    });
    markersRef.current = [];
    if (measureLineRef.current) {
      sceneRef.current.remove(measureLineRef.current);
      measureLineRef.current.geometry.dispose();
      (measureLineRef.current.material as THREE.Material).dispose();
      measureLineRef.current = null;
    }
  };

  const resetMeasurement = () => {
    clearMeasureGraphics();
    setMeasurePoints({ p1: null, p2: null });
    setActiveMeasurement(null);
    if (onMeasureCompleted) onMeasureCompleted(null);
  };

  const computeProfileMeasurement = (
    p1: { x: number; y: number; elev: number },
    p2: { x: number; y: number; elev: number }
  ) => {
    if (!session.dsm) return;
    const dsm = session.dsm;
    const deltaZ = Number((p2.elev - p1.elev).toFixed(2));
    const pixelDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const cellScale = session.isCalibrated ? (session.geoMeta.pixelResolution?.x || 2.0) : 1.0;
    const horizontalDist = Number((pixelDist * cellScale).toFixed(2));

    const pathSlopeDeg = Number(
      ((Math.atan(Math.abs(deltaZ) / Math.max(horizontalDist, 1e-4)) * 180) / Math.PI).toFixed(1)
    );

    // Sample along path
    const numSteps = Math.max(2, Math.min(60, Math.floor(pixelDist)));
    const profile: { step: number; distance: number; elevation: number }[] = [];

    for (let i = 0; i <= numSteps; i++) {
      const t = i / numSteps;
      const gx = Math.min(dsm[0].length - 1, Math.max(0, Math.round(p1.x + t * (p2.x - p1.x))));
      const gy = Math.min(dsm.length - 1, Math.max(0, Math.round(p1.y + t * (p2.y - p1.y))));
      profile.push({
        step: i,
        distance: Number((t * horizontalDist).toFixed(2)),
        elevation: dsm[gy][gx],
      });
    }

    const result: MeasurementResult = {
      pointA: { x: p1.x, y: p1.y, elevation: p1.elev },
      pointB: { x: p2.x, y: p2.y, elevation: p2.elev },
      deltaElevation: deltaZ,
      horizontalDistance: horizontalDist,
      pathSlopeDeg,
      profile,
      unit: session.isCalibrated ? 'm' : 'rel. units',
      isCalibrated: session.isCalibrated,
    };

    setActiveMeasurement(result);
    if (onMeasureCompleted) onMeasureCompleted(result);
  };

  const resetCamera = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    cameraRef.current.position.set(0, 75, 120);
    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-slate-950 overflow-hidden flex flex-col select-none ${
        isFullscreen ? 'fixed inset-0 z-50' : ''
      }`}
    >
      {/* 3D WebGL Canvas */}
      <canvas
        ref={canvasRef}
        className={`w-full h-full block ${measureMode ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
      />

      {/* Top Floating Controls Bar */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none z-10">
        {/* Left Toolbar */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur border border-slate-800 p-1 rounded-lg pointer-events-auto shadow-lg">
          {/* Vertical Exaggeration */}
          <div className="flex items-center gap-1 px-2 border-r border-slate-800">
            <span className="text-[11px] text-slate-400 font-medium">Exaggeration:</span>
            {[0.5, 1.0, 2.0, 5.0].map((val) => (
              <button
                key={val}
                onClick={() => onExaggerationChange(val)}
                className={`px-1.5 py-0.5 text-[11px] font-semibold rounded ${
                  exaggeration === val
                    ? 'bg-teal-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {val}x
              </button>
            ))}
          </div>

          {/* Mesh Resolution */}
          <div className="flex items-center gap-1 px-2 border-r border-slate-800">
            <span className="text-[11px] text-slate-400 font-medium">Res:</span>
            {[64, 128, 160].map((res) => (
              <button
                key={res}
                onClick={() => onMeshResolutionChange(res)}
                className={`px-1.5 py-0.5 text-[11px] font-semibold rounded ${
                  meshResolution === res
                    ? 'bg-teal-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {res === 64 ? 'Low' : res === 128 ? 'Med' : 'High'}
              </button>
            ))}
          </div>

          {/* Wireframe toggle */}
          <button
            onClick={() => setWireframe(!wireframe)}
            className={`px-2 py-1 text-[11px] font-medium rounded flex items-center gap-1 ${
              wireframe ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50' : 'text-slate-400 hover:text-white'
            }`}
            title="Toggle Wireframe Overlay"
          >
            <span>Wireframe</span>
          </button>

          {/* Texture toggle */}
          <button
            onClick={() => setShowTexture(!showTexture)}
            className={`px-2 py-1 text-[11px] font-medium rounded flex items-center gap-1 ${
              showTexture ? 'bg-teal-500/20 text-teal-300 border border-teal-500/50' : 'text-slate-400 hover:text-white'
            }`}
            title="Toggle RGB Surface Texture"
          >
            <span>RGB Texture</span>
          </button>

          {/* Grid toggle */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-1 text-slate-400 hover:text-white rounded ${showGrid ? 'text-teal-400' : ''}`}
            title="Toggle Grid & Spatial Axes"
          >
            <GridIcon className="w-4 h-4" />
          </button>

          {/* Measurement Mode Toggle */}
          <button
            onClick={() => {
              setMeasureMode(!measureMode);
              if (measureMode) resetMeasurement();
            }}
            className={`px-2 py-1 text-[11px] font-medium rounded flex items-center gap-1 ${
              measureMode
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Height & Distance Measurement (Click Point A and Point B)"
          >
            <Ruler className="w-3.5 h-3.5" />
            <span>Measure</span>
          </button>
        </div>

        {/* Right Tools (Reset Camera, Fullscreen) */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur border border-slate-800 p-1 rounded-lg pointer-events-auto shadow-lg">
          <button
            onClick={resetCamera}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
            title="Reset 3D Camera"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Dynamic Hover Probe Overlay (Section 12 requirement) */}
      {hoverData && (
        <div className="absolute top-16 left-3 bg-slate-900/95 border border-slate-700/80 rounded-lg p-2.5 shadow-xl text-xs pointer-events-none z-10 flex flex-col gap-1 min-w-[160px]">
          <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-1">
            <span>Terrain Probe</span>
            <span className="font-mono text-slate-500">[{hoverData.x}, {hoverData.y}]</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Elevation:</span>
            <span className="font-bold font-mono text-teal-300">
              {hoverData.elevation} {hoverData.unit}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Slope:</span>
            <span className="font-bold font-mono text-amber-300">{hoverData.slope}°</span>
          </div>
          {waterLevel !== undefined && waterLevel !== null && (
            <div className="flex items-center justify-between pt-1 border-t border-slate-800">
              <span className="text-slate-400">Flood:</span>
              <span
                className={`font-semibold ${
                  hoverData.isFlooded ? 'text-sky-300 font-bold' : 'text-emerald-400'
                }`}
              >
                {hoverData.isFlooded
                  ? `Submerged (${hoverData.floodDepth} ${hoverData.unit})`
                  : 'Dry Terrain'}
              </span>
            </div>
          )}
          {!session.isCalibrated && (
            <span className="text-[10px] text-amber-400/80 italic mt-0.5">
              Uncalibrated Relative Elevation
            </span>
          )}
        </div>
      )}

      {/* Measurement Mode Prompt / Results Card */}
      {measureMode && (
        <div className="absolute bottom-3 left-3 bg-slate-900/95 border border-amber-600/60 rounded-lg p-3 shadow-2xl text-xs z-10 max-w-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
              <Crosshair className="w-4 h-4" />
              <span>3D Surface Measurement Tool</span>
            </div>
            {measurePoints.p1 && (
              <button
                onClick={resetMeasurement}
                className="text-[11px] text-rose-400 hover:text-rose-300 underline"
              >
                Clear
              </button>
            )}
          </div>

          {!measurePoints.p1 && (
            <p className="text-slate-300 text-[11px]">
              Click on the terrain surface to place <strong>Point A</strong>.
            </p>
          )}

          {measurePoints.p1 && !measurePoints.p2 && (
            <div className="text-[11px] text-slate-300 space-y-1">
              <div>Point A set at: <strong className="text-teal-300">{measurePoints.p1.elev} {session.isCalibrated ? 'm' : 'rel. units'}</strong></div>
              <div className="text-amber-300">Now click on terrain to place <strong>Point B</strong>.</div>
            </div>
          )}

          {activeMeasurement && (
            <div className="space-y-2 pt-1 border-t border-slate-800 text-[11px]">
              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div>
                  <span className="text-slate-400 block">Horiz. Distance:</span>
                  <span className="font-bold text-white font-mono">{activeMeasurement.horizontalDistance} {activeMeasurement.isCalibrated ? 'm' : 'px'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Height Diff (ΔZ):</span>
                  <span className={`font-bold font-mono ${activeMeasurement.deltaElevation >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {activeMeasurement.deltaElevation > 0 ? '+' : ''}{activeMeasurement.deltaElevation} {activeMeasurement.unit}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Point A Elev:</span>
                  <span className="font-mono text-teal-300">{activeMeasurement.pointA.elevation} {activeMeasurement.unit}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Point B Elev:</span>
                  <span className="font-mono text-amber-300">{activeMeasurement.pointB.elevation} {activeMeasurement.unit}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-slate-400">
                <span>Avg Path Slope:</span>
                <span className="font-mono text-amber-400 font-bold">{activeMeasurement.pathSlopeDeg}°</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Spatial Scale & Compass Watermark */}
      <div className="absolute bottom-3 right-3 flex items-center gap-3 bg-slate-900/80 backdrop-blur border border-slate-800 px-3 py-1.5 rounded-lg text-slate-400 text-xs pointer-events-none">
        <div className="flex items-center gap-1.5">
          <CompassIcon className="w-3.5 h-3.5 text-teal-400" />
          <span className="text-[11px] font-mono">N ↑</span>
        </div>
        <div className="h-3 w-[1px] bg-slate-700" />
        <div className="flex items-center gap-1">
          <span className="text-[11px]">Scale:</span>
          <span className="font-mono text-slate-300 text-[11px]">
            {session.isCalibrated ? `${session.geoMeta.pixelResolution?.x ?? 1.0}m/cell` : '1.0 unit/cell'}
          </span>
        </div>
      </div>
    </div>
  );
};
