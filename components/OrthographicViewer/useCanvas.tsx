import { useCallback, useRef, useState, useEffect } from "react";

type Point = { x: number; y: number };
type MeasureData = {
  points: Point[];
  lines: { p1: Point; p2: Point; dist: number }[];
};

type Dimensions = {
  xy: { width: number; height: number };
  xz: { width: number; height: number };
  yz: { width: number; height: number };
};

type ScaledDimensions = {
  xy: { width: number; height: number; scale: number };
  xz: { width: number; height: number; scale: number };
  yz: { width: number; height: number; scale: number };
};

import type { Dispatch, SetStateAction } from "react";

export default function useCanvas(
  theme: string | undefined,
  coords: { x: number; y: number; z: number },
  measureData: { XY: MeasureData; XZ: MeasureData; YZ: MeasureData },
  setLoading: (loading: boolean) => void,
  setErrorMessage: (message: string | null) => void,
  setCoords: Dispatch<SetStateAction<{ x: number; y: number; z: number }>>,
  blobUrl: string,
  numZ: number,
  numY: number,
  numX: number
) {
  // Use pure black and white background colors without any blueish tones
  const bgColor = theme === "dark" ? "#000000" : "#ffffff";

  const [dimensions, setDimensions] = useState<Dimensions>({
    xy: { width: 512, height: 512 },
    xz: { width: 512, height: 160 },
    yz: { width: 512, height: 160 },
  });

  // New state for scaled dimensions that fit the viewport
  const [scaledDimensions, setScaledDimensions] = useState<ScaledDimensions>({
    xy: { width: 512, height: 512, scale: 1 },
    xz: { width: 512, height: 160, scale: 1 },
    yz: { width: 512, height: 160, scale: 1 },
  });

  const canvasXY = useRef<HTMLCanvasElement | null>(null);
  const canvasXZ = useRef<HTMLCanvasElement | null>(null);
  const canvasYZ = useRef<HTMLCanvasElement | null>(null);

  const slicesXY = useRef<HTMLImageElement[]>([]);
  const slicesXZ = useRef<HTMLImageElement[]>([]);
  const slicesYZ = useRef<HTMLImageElement[]>([]);

  const loaded = useRef(false);
  const [panXY, setPanXY] = useState({ x: 0, y: 0 });
  const [panXZ, setPanXZ] = useState({ x: 0, y: 0 });
  const [panYZ, setPanYZ] = useState({ x: 0, y: 0 });

  const [zoomXY, setZoomXY] = useState(1);
  const [zoomXZ, setZoomXZ] = useState(1);
  const [zoomYZ, setZoomYZ] = useState(1);

  const panRefXY = useRef({ x: 0, y: 0 });
  const panRefXZ = useRef({ x: 0, y: 0 });
  const panRefYZ = useRef({ x: 0, y: 0 });

  const isPanningRef = useRef<"XY" | "XZ" | "YZ" | null>(null);
  const lastMouse = useRef({ x: 0, y: 0 });

  const [activePixelColor, setActivePixelColor] = useState<{
    view: "XY" | "XZ" | "YZ";
    color: string;
  } | null>(null);

  // Function to calculate optimal scaling for viewport
  const calculateOptimalScaling = useCallback((naturalDimensions: Dimensions) => {
    // Target viewport dimensions (accounting for padding and controls)
    const targetViewportWidth = window.innerWidth - 80; // 40px padding on each side
    const targetViewportHeight = window.innerHeight - 200; // Account for controls, padding, etc.
    
    // Calculate how much space each view should take
    // XY gets more space (top), XZ and YZ share bottom space
    const xyHeight = targetViewportHeight * 0.6; // 60% of height
    const bottomHeight = targetViewportHeight * 0.4; // 40% of height
    
    // Calculate scales for each view
    const xyScale = Math.min(
      (targetViewportWidth * 0.9) / naturalDimensions.xy.width,
      xyHeight / naturalDimensions.xy.height
    );
    
    const xzScale = Math.min(
      (targetViewportWidth * 0.45) / naturalDimensions.xz.width,
      bottomHeight / naturalDimensions.xz.height
    );
    
    const yzScale = Math.min(
      (targetViewportWidth * 0.45) / naturalDimensions.yz.width,
      bottomHeight / naturalDimensions.yz.height
    );
    
    // Apply minimum scale to ensure visibility
    const minScale = 0.1;
    const finalXyScale = Math.max(xyScale, minScale);
    const finalXzScale = Math.max(xzScale, minScale);
    const finalYzScale = Math.max(yzScale, minScale);
    
    return {
      xy: {
        width: Math.round(naturalDimensions.xy.width * finalXyScale),
        height: Math.round(naturalDimensions.xy.height * finalXyScale),
        scale: finalXyScale
      },
      xz: {
        width: Math.round(naturalDimensions.xz.width * finalXzScale),
        height: Math.round(naturalDimensions.xz.height * finalXzScale),
        scale: finalXzScale
      },
      yz: {
        width: Math.round(naturalDimensions.yz.width * finalYzScale),
        height: Math.round(naturalDimensions.yz.height * finalYzScale),
        scale: finalYzScale
      }
    };
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (loaded.current && dimensions.xy.width > 0) {
        const newScaledDimensions = calculateOptimalScaling(dimensions);
        setScaledDimensions(newScaledDimensions);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [dimensions, calculateOptimalScaling]);

  // Recalculate scaling when blobUrl changes (modality switch)
  useEffect(() => {
    if (loaded.current && dimensions.xy.width > 0) {
      const newScaledDimensions = calculateOptimalScaling(dimensions);
      setScaledDimensions(newScaledDimensions);
    }
  }, [blobUrl, dimensions, calculateOptimalScaling]);

  /** Load a single image by URL */
  const loadSingleImage = useCallback((url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = url;
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load: ${url}`));
    });
  }, []);



  const preloadImages = useCallback(async () => {
    setLoading(true);
    try {
      // PHASE 1: Load ONLY the center slices (3 images) for instant LCP
      const midZ = Math.floor(numZ / 2);
      const midY = Math.floor(numY / 2);
      const midX = Math.floor(numX / 2);

      const pad = (n: number) => n.toString().padStart(3, "0");
      const [centerXY, centerXZ, centerYZ] = await Promise.all([
        loadSingleImage(`${blobUrl}/xy/${pad(midZ)}.png`),
        loadSingleImage(`${blobUrl}/xz/${pad(midY)}.png`),
        loadSingleImage(`${blobUrl}/yz/${pad(midX)}.png`),
      ]);

      // Set up dimensions from the first loaded images
      const naturalDimensions = {
        xy: { width: centerXY.naturalWidth, height: centerXY.naturalHeight },
        xz: { width: centerXZ.naturalWidth, height: centerXZ.naturalHeight },
        yz: { width: centerYZ.naturalWidth, height: centerYZ.naturalHeight },
      };
      setDimensions(naturalDimensions);
      const optimalScaling = calculateOptimalScaling(naturalDimensions);
      setScaledDimensions(optimalScaling);

      // Initialize sparse arrays with center slices placed
      const xyArr: HTMLImageElement[] = new Array(numZ);
      const xzArr: HTMLImageElement[] = new Array(numY);
      const yzArr: HTMLImageElement[] = new Array(numX);
      xyArr[midZ] = centerXY;
      xzArr[midY] = centerXZ;
      yzArr[midX] = centerYZ;

      slicesXY.current = xyArr;
      slicesXZ.current = xzArr;
      slicesYZ.current = yzArr;

      loaded.current = true;
      setLoading(false); // Viewer is interactive now!

      // PHASE 2: Load remaining slices in background batches
      const makeUrls = (folder: string, count: number, skip: number) =>
        Array.from({ length: count }, (_, i) => i)
          .filter(i => i !== skip)
          .map(i => ({ i, url: `${blobUrl}/${folder}/${pad(i)}.png` }));

      const xyRemaining = makeUrls("xy", numZ, midZ);
      const xzRemaining = makeUrls("xz", numY, midY);
      const yzRemaining = makeUrls("yz", numX, midX);

      // Load each axis in parallel, but each axis loads in batches internally
      const loadAxis = async (items: { i: number; url: string }[], target: HTMLImageElement[]) => {
        const BATCH = 30;
        for (let b = 0; b < items.length; b += BATCH) {
          const batch = items.slice(b, b + BATCH);
          const imgs = await Promise.all(batch.map(item => loadSingleImage(item.url)));
          batch.forEach((item, j) => { target[item.i] = imgs[j]; });
        }
      };

      await Promise.all([
        loadAxis(xyRemaining, slicesXY.current),
        loadAxis(xzRemaining, slicesXZ.current),
        loadAxis(yzRemaining, slicesYZ.current),
      ]);
    } catch (error) {
      console.error("Error preloading images:", error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to load images");
      setLoading(false);
    }
  }, [blobUrl, numZ, numY, numX, loadSingleImage, calculateOptimalScaling, setLoading, setErrorMessage]);

  const drawCrosshair = useCallback(
    (ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(ctx.canvas.width, y);
      ctx.moveTo(x, 0);
      ctx.lineTo(x, ctx.canvas.height);
      ctx.stroke();
    },
    []
  );

  const drawMeasurement = useCallback(
    (ctx: CanvasRenderingContext2D, lines: { p1: Point; p2: Point; dist: number }[]) => {
      lines.forEach(({ p1, p2, dist }) => {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = "#00ffff";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "#00ffff";
        ctx.font = "14px sans-serif";
        ctx.fillText(
          `${dist.toFixed(2)} µm`,
          (p1.x + p2.x) / 2,
          (p1.y + p2.y) / 2
        );
      });
    },
    []
  );

  const drawAll = useCallback(() => {
    if (!loaded.current) return;
    const { x, y, z } = coords;

    const ctxXY = canvasXY.current?.getContext("2d");
    const ctxXZ = canvasXZ.current?.getContext("2d");
    const ctxYZ = canvasYZ.current?.getContext("2d");

    if (ctxXY && slicesXY.current[z]) {
      ctxXY.fillStyle = bgColor;
      ctxXY.fillRect(0, 0, ctxXY.canvas.width, ctxXY.canvas.height);
      ctxXY.save();
      ctxXY.translate(panXY.x, panXY.y);
      ctxXY.scale(zoomXY, zoomXY);
      
      // Draw the image scaled to fit the canvas
      const scaleX = scaledDimensions.xy.width / dimensions.xy.width;
      const scaleY = scaledDimensions.xy.height / dimensions.xy.height;
      ctxXY.scale(scaleX, scaleY);
      
      ctxXY.drawImage(slicesXY.current[z], 0, 0);
      ctxXY.restore();
      
      // Draw measurements and crosshair on scaled coordinates
      ctxXY.save();
      ctxXY.translate(panXY.x, panXY.y);
      ctxXY.scale(zoomXY * scaleX, zoomXY * scaleY);
      drawMeasurement(ctxXY, measureData.XY.lines);
      ctxXY.restore();
      
      // Draw crosshair with proper scaling
      const scaledX = x * scaleX;
      const scaledY = y * scaleY;
      drawCrosshair(ctxXY, scaledX + panXY.x, scaledY + panXY.y, "red");
    }

    if (ctxXZ && slicesXZ.current[y]) {
      ctxXZ.fillStyle = bgColor;
      ctxXZ.fillRect(0, 0, ctxXZ.canvas.width, ctxXZ.canvas.height);
      ctxXZ.save();
      ctxXZ.translate(panXZ.x, panXZ.y);
      ctxXZ.scale(zoomXZ, zoomXZ);
      
      // Draw the image scaled to fit the canvas
      const scaleX = scaledDimensions.xz.width / dimensions.xz.width;
      const scaleY = scaledDimensions.xz.height / dimensions.xz.height;
      ctxXZ.scale(scaleX, scaleY);
      
      ctxXZ.drawImage(slicesXZ.current[y], 0, 0);
      ctxXZ.restore();
      
      // Draw measurements and crosshair on scaled coordinates
      ctxXZ.save();
      ctxXZ.translate(panXZ.x, panXZ.y);
      ctxXZ.scale(zoomXZ * scaleX, zoomXZ * scaleY);
      drawMeasurement(ctxXZ, measureData.XZ.lines);
      ctxXZ.restore();
      
      // Draw crosshair with proper scaling
      const scaledX = x * scaleX;
      const scaledZ = z * scaleY;
      drawCrosshair(ctxXZ, scaledX + panXZ.x, scaledZ + panXZ.y, "red");
    }

    if (ctxYZ && slicesYZ.current[x]) {
      ctxYZ.fillStyle = bgColor;
      ctxYZ.fillRect(0, 0, ctxYZ.canvas.width, ctxYZ.canvas.height);
      ctxYZ.save();
      ctxYZ.translate(panYZ.x, panYZ.y);
      ctxYZ.scale(zoomYZ, zoomYZ);
      
      // Draw the image scaled to fit the canvas
      const scaleX = scaledDimensions.yz.width / dimensions.yz.width;
      const scaleY = scaledDimensions.yz.height / dimensions.yz.height;
      ctxYZ.scale(scaleX, scaleY);
      
      ctxYZ.drawImage(slicesYZ.current[x], 0, 0);
      ctxYZ.restore();
      
      // Draw measurements and crosshair on scaled coordinates
      ctxYZ.save();
      ctxYZ.translate(panYZ.x, panYZ.y);
      ctxYZ.scale(zoomYZ * scaleX, zoomYZ * scaleY);
      drawMeasurement(ctxYZ, measureData.YZ.lines);
      ctxYZ.restore();
      
      // Draw crosshair with proper scaling
      const scaledY = y * scaleX;
      const scaledZ = z * scaleY;
      drawCrosshair(ctxYZ, scaledY + panYZ.x, scaledZ + panYZ.y, "red");
    }
  }, [
    loaded,
    coords,
    bgColor,
    panXY,
    panXZ,
    panYZ,
    zoomXY,
    zoomXZ,
    zoomYZ,
    measureData,
    dimensions,
    scaledDimensions,
    drawCrosshair,
    drawMeasurement,
  ]);

  // Utility function to convert screen coordinates to image coordinates for scaled canvases
  const getScaledImageCoordinates = useCallback((
    view: "XY" | "XZ" | "YZ",
    screenX: number,
    screenY: number,
    pan: { x: number; y: number },
    zoom: number
  ) => {
    const scaleX = scaledDimensions[view.toLowerCase() as keyof typeof scaledDimensions].width / dimensions[view.toLowerCase() as keyof typeof dimensions].width;
    const scaleY = scaledDimensions[view.toLowerCase() as keyof typeof scaledDimensions].height / dimensions[view.toLowerCase() as keyof typeof dimensions].height;
    
    // Convert screen coordinates to image coordinates
    const imageX = (screenX - pan.x) / (zoom * scaleX);
    const imageY = (screenY - pan.y) / (zoom * scaleY);
    
    return { x: imageX, y: imageY };
  }, [scaledDimensions, dimensions]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>, view: "XY" | "XZ" | "YZ") => {
      const canvas = { XY: canvasXY, XZ: canvasXZ, YZ: canvasYZ }[view].current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const pan = { XY: panXY, XZ: panXZ, YZ: panYZ }[view];
      const zoom = { XY: zoomXY, XZ: zoomXZ, YZ: zoomYZ }[view];

      // Get coordinates relative to the scaled canvas
      const canvasX = e.clientX - rect.left;
      const canvasY = e.clientY - rect.top;
      
      // Convert to image coordinates using the scaling utility
      const imageCoords = getScaledImageCoordinates(view, canvasX, canvasY, pan, zoom);

      let newCoords = { ...coords };

      if (view === "XY") {
        newCoords = {
          ...coords,
          x: Math.floor(imageCoords.x),
          y: Math.floor(imageCoords.y),
        };
      } else if (view === "XZ") {
        newCoords = {
          ...coords,
          x: Math.floor(imageCoords.x),
          z: Math.floor(imageCoords.y),
        };
      } else if (view === "YZ") {
        newCoords = {
          ...coords,
          y: Math.floor(imageCoords.x),
          z: Math.floor(imageCoords.y),
        };
      }

      // Clamp coordinates to valid ranges
      newCoords.x = Math.max(0, Math.min(newCoords.x, numX - 1));
      newCoords.y = Math.max(0, Math.min(newCoords.y, numY - 1));
      newCoords.z = Math.max(0, Math.min(newCoords.z, numZ - 1));

      setCoords(newCoords);
    },
    [coords, zoomXY, zoomXZ, zoomYZ, panXY, panXZ, panYZ, setCoords, numX, numY, numZ, getScaledImageCoordinates]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>, view: "XY" | "XZ" | "YZ") => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const setZoomMap = { XY: setZoomXY, XZ: setZoomXZ, YZ: setZoomYZ };
        const setZoom = setZoomMap[view];
        if (setZoom) {
          setZoom((prevZoom) => {
            const newZoom = e.deltaY > 0 ? prevZoom * 0.95 : prevZoom * 1.05;
            return Math.min(Math.max(newZoom, 0.1), 5);
          });
        }
      } else {
        setCoords((prev) => ({
          ...prev,
          z: Math.min(Math.max(prev.z + (e.deltaY > 0 ? 1 : -1), 0), numZ - 1),
        }));
      }
    },
    [setCoords, numZ]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>, view: "XY" | "XZ" | "YZ") => {
      if (e.button === 2) {
        isPanningRef.current = view;
        lastMouse.current = { x: e.clientX, y: e.clientY };
      }
    },
    []
  );



  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isPanningRef.current) return;

      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      lastMouse.current = { x: e.clientX, y: e.clientY };

      const localPanMap = {
        XY: [panRefXY, setPanXY],
        XZ: [panRefXZ, setPanXZ],
        YZ: [panRefYZ, setPanYZ],
      } as const;

      const panState = localPanMap[isPanningRef.current];

      if (panState) {
        const [ref, set] = panState;
        if ("current" in ref) {
          ref.current = { x: ref.current.x + dx, y: ref.current.y + dy };
          set({ ...ref.current });
        }
        drawAll();
      }
    },
    [drawAll]
  );

  const handleMouseUp = useCallback(() => {
    isPanningRef.current = null;
  }, []);

  const handleMouseMoveColor = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>, view: "XY" | "XZ" | "YZ") => {
      const canvasRef = { XY: canvasXY, XZ: canvasXZ, YZ: canvasYZ }[view];
      const pan = { XY: panXY, XZ: panXZ, YZ: panYZ }[view];
      const zoom = { XY: zoomXY, XZ: zoomXZ, YZ: zoomYZ }[view];

      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;

      const rect = e.currentTarget.getBoundingClientRect();
      
      // Get coordinates relative to the scaled canvas
      const canvasX = e.clientX - rect.left;
      const canvasY = e.clientY - rect.top;
      
      // Convert to image coordinates using the scaling utility
      const imageCoords = getScaledImageCoordinates(view, canvasX, canvasY, pan, zoom);
      
      // Clamp coordinates to canvas bounds
      const clampedX = Math.max(0, Math.min(Math.floor(imageCoords.x), ctx.canvas.width - 1));
      const clampedY = Math.max(0, Math.min(Math.floor(imageCoords.y), ctx.canvas.height - 1));

      try {
        const imageData = ctx.getImageData(clampedX, clampedY, 1, 1).data;
        setActivePixelColor({
          view,
          color: `RGBA(${imageData[0]}, ${imageData[1]}, ${imageData[2]}, ${imageData[3]})`,
        });
      } catch (error) {
        console.error("Error getting pixel color:", error);
        // Handle out-of-bounds access gracefully
        setActivePixelColor({
          view, 
          color: "RGBA(0, 0, 0, 0)",
        });
      }
    },
    [panXY, panXZ, panYZ, zoomXY, zoomXZ, zoomYZ, getScaledImageCoordinates]
  );

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  // Reset function to restore original scaling and coordinates
  const resetView = useCallback(() => {
    if (loaded.current && dimensions.xy.width > 0) {
      const optimalScaling = calculateOptimalScaling(dimensions);
      setScaledDimensions(optimalScaling);
      
      // Reset pan and zoom
      setPanXY({ x: 0, y: 0 });
      setPanXZ({ x: 0, y: 0 });
      setPanYZ({ x: 0, y: 0 });
      setZoomXY(1);
      setZoomXZ(1);
      setZoomYZ(1);
      
      // Reset coordinates to center
      setCoords({
        x: Math.floor(numX / 2),
        y: Math.floor(numY / 2),
        z: Math.floor(numZ / 2),
      });
    }
  }, [loaded, dimensions, calculateOptimalScaling, numX, numY, numZ, setCoords]);

  return {
    canvasXY,
    canvasXZ,
    canvasYZ,
    dimensions,
    scaledDimensions,
    zoomXY,
    zoomXZ,
    zoomYZ,
    panXY,
    panXZ,
    panYZ,
    setPanXY,
    setPanXZ,
    setPanYZ,
    setZoomXY,
    setZoomXZ,
    setZoomYZ,
    handleClick,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseMoveColor,
    handleContextMenu,
    preloadImages,
    drawAll,
    activePixelColor,
    resetView, // Add reset function
  };
}