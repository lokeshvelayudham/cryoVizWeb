import { useCallback, useEffect, useRef, useState } from "react";

const NUM_Z = 165; // slicesXY (Z-axis slices)
const NUM_Y = 416; // slicesXZ (Y-axis slices)
const NUM_X = 1118; // slicesYZ (X-axis slices)

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

export default function useCanvas(
  theme: string | undefined,
  coords: { x: number; y: number; z: number },
  measureData: { XY: MeasureData; XZ: MeasureData; YZ: MeasureData },
  setLoading: (loading: boolean) => void,
  setErrorMessage: (message: string | null) => void,
  setCoords: (coords: { x: number; y: number; z: number }) => void,
  brightfieldBlobUrl: string
) {
  const bgColor = theme === "dark" ? "#171717" : "#fafafa";

  const [dimensions, setDimensions] = useState<Dimensions>({
    xy: { width: 512, height: 512 },
    xz: { width: 512, height: 160 },
    yz: { width: 512, height: 160 },
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

  const loadImageSet = useCallback(async (folder: string, count: number) => {
    const promises: Promise<HTMLImageElement>[] = Array.from({ length: count }, (_, i) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous"; // Allow CORS for external URLs
        img.src = `${brightfieldBlobUrl}/${folder}/${i.toString().padStart(3, "0")}.png`;
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image ${i}`));
      });
    });

    try {
      const images = await Promise.all(promises);
      return images;
    } catch (error) {
      throw new Error(`Error loading image set ${folder}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [brightfieldBlobUrl]);

  const preloadImages = useCallback(async () => {
    setLoading(true);
    try {
      const [xy, xz, yz] = await Promise.all([
        loadImageSet("xy", NUM_Z), // Assuming 'brightfield' folder structure
        loadImageSet("xz", NUM_Y), // Adjust folder names if different
        loadImageSet("yz", NUM_X),
      ]);
      slicesXY.current = xy;
      slicesXZ.current = xz;
      slicesYZ.current = yz;

      setDimensions({
        xy: { width: xy[0].naturalWidth, height: xy[0].naturalHeight },
        xz: { width: xz[0].naturalWidth, height: xz[0].naturalHeight },
        yz: { width: yz[0].naturalWidth, height: yz[0].naturalHeight },
      });

      loaded.current = true;
      setCoords({
        x: Math.floor(NUM_X / 2),
        y: Math.floor(NUM_Y / 2),
        z: Math.floor(NUM_Z / 2),
      });
    } catch (error) {
      console.error("Error loading images:", error);
      setErrorMessage(`Failed to load images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setErrorMessage, setCoords, brightfieldBlobUrl]);

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
      ctxXY.drawImage(slicesXY.current[z], 0, 0);
      drawMeasurement(ctxXY, measureData.XY.lines);
      ctxXY.restore();
      drawCrosshair(ctxXY, x, y, "red");
    }

    if (ctxXZ && slicesXZ.current[y]) {
      ctxXZ.fillStyle = bgColor;
      ctxXZ.fillRect(0, 0, ctxXZ.canvas.width, ctxXZ.canvas.height);
      ctxXZ.save();
      ctxXZ.translate(panXZ.x, panXZ.y);
      ctxXZ.scale(zoomXZ, zoomXZ);
      ctxXZ.drawImage(slicesXZ.current[y], 0, 0);
      drawMeasurement(ctxXZ, measureData.XZ.lines);
      ctxXZ.restore();
      drawCrosshair(ctxXZ, x, z, "green");
    }

    if (ctxYZ && slicesYZ.current[x]) {
      ctxYZ.fillStyle = bgColor;
      ctxYZ.fillRect(0, 0, ctxYZ.canvas.width, ctxYZ.canvas.height);
      ctxYZ.save();
      ctxYZ.translate(panYZ.x, panYZ.y);
      ctxYZ.scale(zoomYZ, zoomYZ);
      ctxYZ.drawImage(slicesYZ.current[x], 0, 0);
      drawMeasurement(ctxYZ, measureData.YZ.lines);
      ctxYZ.restore();
      drawCrosshair(ctxYZ, y, z, "blue");
    }
  }, [coords, zoomXY, zoomXZ, zoomYZ, panXY, panXZ, panYZ, measureData, bgColor, drawCrosshair, drawMeasurement]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>, view: "XY" | "XZ" | "YZ") => {
      const rect = e.currentTarget.getBoundingClientRect();
      const zoom = { XY: zoomXY, XZ: zoomXZ, YZ: zoomYZ }[view];
      const mx = Math.min(
        Math.max((e.clientX - rect.left) / zoom, 0),
        dimensions[view.toLowerCase() as keyof typeof dimensions].width - 1
      );
      const my = Math.min(
        Math.max((e.clientY - rect.top) / zoom, 0),
        dimensions[view.toLowerCase() as keyof typeof dimensions].height - 1
      );

      let newCoords = { ...coords };
      if (view === "XY") {
        newCoords = {
          ...coords,
          x: Math.floor((mx / dimensions.xy.width) * NUM_X),
          y: Math.floor((my / dimensions.xy.height) * NUM_Y),
        };
      } else if (view === "XZ") {
        newCoords = {
          ...coords,
          x: Math.floor((mx / dimensions.xz.width) * NUM_X),
          z: Math.floor((my / dimensions.xz.height) * NUM_Z),
        };
      } else if (view === "YZ") {
        newCoords = {
          ...coords,
          y: Math.floor((mx / dimensions.yz.width) * NUM_Y),
          z: Math.floor((my / dimensions.yz.height) * NUM_Z),
        };
      }

      setCoords(newCoords);
    },
    [coords, zoomXY, zoomXZ, zoomYZ, dimensions, setCoords]
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
          z: Math.min(Math.max(prev.z + (e.deltaY > 0 ? 1 : -1), 0), NUM_Z - 1),
        }));
      }
    },
    [setCoords]
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

      const panState = {
        XY: [panRefXY, setPanXY],
        XZ: [panRefXZ, setPanXZ],
        YZ: [panRefYZ, setPanYZ],
      }[isPanningRef.current];

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
      const x = Math.floor((e.clientX - rect.left - pan.x) / zoom);
      const y = Math.floor((e.clientY - rect.top - pan.y) / zoom);

      const imageData = ctx.getImageData(x, y, 1, 1).data;
      setActivePixelColor({
        view,
        color: `RGBA(${imageData[0]}, ${imageData[1]}, ${imageData[2]}, ${imageData[3]})`,
      });
    },
    [panXY, panXZ, panYZ, zoomXY, zoomXZ, zoomYZ]
  );

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  return {
    canvasXY,
    canvasXZ,
    canvasYZ,
    dimensions,
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
  };
}