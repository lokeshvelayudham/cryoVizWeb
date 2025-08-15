"use client";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import XYZControls from "./XYZControls";
import MeasureToggleButton from "./MeasureTool";
import LoadingOverlay from "./LoadingOverlay";
import AnnotationPanel from "./Annotation/AnnotationPanel";
import AnnotationTextBox from "./Annotation/AnnotationTextBox";
import AnnotationModal from "./Annotation/AnnotationModal";
import ViewControlPanel from "./Views/ViewControlPanel";
import useAnnotations from "./Annotation/useAnnotations";
import useCanvas from "./useCanvas";
import useMeasurements from "./useMeasurements";
import MediaControlPanel from "./MediaControlPanel";

type Point = { x: number; y: number };
type MeasureData = {
  points: Point[];
  lines: { p1: Point; p2: Point; dist: number }[];
};

type ViewerProps = {
  brightfieldBlobUrl: string;
  datasetId: string;
  brightfieldNumZ: number;
  brightfieldNumY: number;
  brightfieldNumX: number;
  fluorescentNumZ: number;
  fluorescentNumY: number;
  fluorescentNumX: number;
};

export default function OrthographicViewer(props: ViewerProps) {
  const {
    brightfieldBlobUrl,
    datasetId,
    brightfieldNumZ,
    brightfieldNumY,
    brightfieldNumX,
    fluorescentNumZ,
    fluorescentNumY,
    fluorescentNumX,
  } = props;

  // 🔒 All hooks must be called unconditionally, at the top:
  const { theme } = useTheme();
  const { data: session, status } = useSession();
  const userEmail = session?.user?.email || null;

  const [coords, setCoords] = useState({
    x: Math.floor((brightfieldNumX || fluorescentNumX) / 2),
    y: Math.floor((brightfieldNumY || fluorescentNumY) / 2),
    z: Math.floor((brightfieldNumZ || fluorescentNumZ) / 2),
  });

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measureData, setMeasureData] = useState<{
    XY: MeasureData;
    XZ: MeasureData;
    YZ: MeasureData;
  }>({
    XY: { points: [], lines: [] },
    XZ: { points: [], lines: [] },
    YZ: { points: [], lines: [] },
  });

  const [activePixelColor, setActivePixelColor] = useState<{
    view: "XY" | "XZ" | "YZ";
    color: string;
  } | null>(null);

  const hasDataset = Boolean(datasetId);

  // Annotations
  const {
    annotations,
    isAnnotating,
    showAnnotations,
    editingAnnotationId,
    editingText,
    setAnnotations,
    setIsAnnotating,
    setShowAnnotations,
    setEditingAnnotationId,
    setEditingText,
    fetchAnnotations,
    saveAnnotationToMongoDB,
    deleteAnnotationFromMongoDB,
    handleEditAnnotation,
    handleSaveEdit,
  } = useAnnotations(userEmail, setErrorMessage, datasetId);

  // Canvas logic
  const {
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
    activePixelColor: canvasActivePixelColor,
  } = useCanvas(
    theme,
    coords,
    measureData,
    setLoading,
    setErrorMessage,
    setCoords,
    brightfieldBlobUrl,
    brightfieldNumZ,
    brightfieldNumY,
    brightfieldNumX,
    fluorescentNumZ,
    fluorescentNumY,
    fluorescentNumX
  );

  // Measurements (prefix var to avoid unused warning)
  const {  handleMeasureClick, handleToggleMeasure } =
    useMeasurements(
      {
        XY: canvasXY as React.RefObject<HTMLCanvasElement>,
        XZ: canvasXZ as React.RefObject<HTMLCanvasElement>,
        YZ: canvasYZ as React.RefObject<HTMLCanvasElement>,
      },
      { XY: panXY, XZ: panXZ, YZ: panYZ },
      { XY: zoomXY, XZ: zoomXZ, YZ: zoomYZ },
      drawAll,
      measureData,
      setMeasureData
    );

  // Sync color from canvas
  useEffect(() => {
    setActivePixelColor(canvasActivePixelColor);
  }, [canvasActivePixelColor]);

  // Auth-based annotations fetch
  useEffect(() => {
    if (status === "authenticated") {
      fetchAnnotations();
    } else {
      setAnnotations([]);
    }
  }, [status, fetchAnnotations, setAnnotations]);

  // Redraw on dependencies
  useEffect(() => {
    drawAll();
  }, [drawAll]);

  // Preload images once dependencies ready
  useEffect(() => {
    preloadImages();
  }, [preloadImages]);

  const handleAnnotationClick = (
    e: React.MouseEvent<HTMLCanvasElement>,
    view: "XY" | "XZ" | "YZ"
  ) => {
    if (!isAnnotating) return;
    if (!userEmail) {
      setErrorMessage("Please log in to create annotations.");
      setIsAnnotating(false);
      return;
    }

    const canvas = { XY: canvasXY, XZ: canvasXZ, YZ: canvasYZ }[view].current!;
    const rect = canvas.getBoundingClientRect();
    const pan = { XY: panXY, XZ: panXZ, YZ: panYZ }[view];
    const zoom = { XY: zoomXY, XZ: zoomXZ, YZ: zoomYZ }[view];
    const dim = dimensions[view.toLowerCase() as keyof typeof dimensions];

    const imageX = (e.clientX - rect.left - pan.x) / zoom;
    const imageY = (e.clientY - rect.top - pan.y) / zoom;

    const clampedX = Math.max(0, Math.min(imageX, dim.width));
    const clampedY = Math.max(0, Math.min(imageY, dim.height));

    const slice = { XY: coords.z, XZ: coords.y, YZ: coords.x }[view];

    const newAnnotation = {
      _id: "",
      id: crypto.randomUUID(),
      view,
      slice,
      x: clampedX,
      y: clampedY,
      text: "",
      instance: 0,
      datetime: Date.now(),
      user: userEmail,
      datasetId,
      status: "active",
    };

    setAnnotations((prev) => [...prev, newAnnotation]);
  };

  const handleCanvasClick = (
    e: React.MouseEvent<HTMLCanvasElement>,
    view: "XY" | "XZ" | "YZ"
  ) => {
    if (isMeasuring) {
      handleMeasureClick(e, view);
    } else if (isAnnotating) {
      handleAnnotationClick(e, view);
    } else {
      handleClick(e, view);
    }
  };

  const handleSlider = (axis: "x" | "y" | "z", value: number) => {
    setCoords((prev) => ({ ...prev, [axis]: value }));
  };

  const handleReset = () => {
    setCoords({
      x: Math.floor((brightfieldNumX || fluorescentNumX) / 2),
      y: Math.floor((brightfieldNumY || fluorescentNumY) / 2),
      z: Math.floor((brightfieldNumZ || fluorescentNumZ) / 2),
    });
    setPanXY({ x: 0, y: 0 });
    setPanXZ({ x: 0, y: 0 });
    setPanYZ({ x: 0, y: 0 });
    setZoomXY(1);
    setZoomXZ(1);
    setZoomYZ(1);
  };

  const handleToggleMeasureWrapper = () => {
    setIsMeasuring((prev) => {
      const newVal = !prev;
      handleToggleMeasure(newVal);
      return newVal;
    });
  };

  const setZoom = (zoom: { XY: number; XZ: number; YZ: number }) => {
    setZoomXY(zoom.XY);
    setZoomXZ(zoom.XZ);
    setZoomYZ(zoom.YZ);
  };

  const setPan = (pan: {
    XY: { x: number; y: number };
    XZ: { x: number; y: number };
    YZ: { x: number; y: number };
  }) => {
    setPanXY(pan.XY);
    setPanXZ(pan.XZ);
    setPanYZ(pan.YZ);
  };

  return hasDataset ? (
    <div className="h-full w-full p-4 overflow-hidden relative">
      {loading && <LoadingOverlay />}
      {errorMessage && (
        <div className="absolute top-12 left-12 bg-red-500/80 text-white px-4 py-2 rounded z-[1000]">
          {errorMessage}
        </div>
      )}
      {showModal && (
        <AnnotationModal
          annotations={annotations}
          editingAnnotationId={editingAnnotationId}
          editingText={editingText}
          setEditingAnnotationId={setEditingAnnotationId}
          setEditingText={setEditingText}
          handleEditAnnotation={handleEditAnnotation}
          handleSaveEdit={handleSaveEdit}
          deleteAnnotationFromMongoDB={deleteAnnotationFromMongoDB}
          onClose={() => setShowModal(false)}
          setCoords={setCoords}
        />
      )}
      <div className="flex flex-col h-[90%]">
        {/* XY */}
        <div className="flex-1 flex justify-center relative">
          <canvas
            ref={canvasXY}
            width={dimensions.xy.width}
            height={dimensions.xy.height}
            onClick={(e) => handleCanvasClick(e, "XY")}
            onWheel={(e) => handleWheel(e, "XY")}
            onMouseDown={(e) => handleMouseDown(e, "XY")}
            onMouseMove={(e) => {
              handleMouseMove(e);
              handleMouseMoveColor(e, "XY");
            }}
            onMouseUp={handleMouseUp}
            onContextMenu={handleContextMenu}
            className="relative"
          />
          {showAnnotations &&
            annotations.map(
              (a) =>
                a.view === "XY" &&
                a.slice === coords.z && (
                  <AnnotationTextBox
                    key={a._id || a.id}
                    annotation={{ ...a, _id: a._id ?? a.id }} // force _id to exist
                    zoomXY={zoomXY}
                    panXY={panXY}
                    canvasRef={canvasXY as React.RefObject<HTMLCanvasElement>}
                    onUpdate={(id, text, newPos, save) => {
                      const updatedAnnotation = annotations.find(
                        (ann) => ann._id === id || ann.id === id
                      );
                      if (updatedAnnotation) {
                        const newAnnotation = {
                          ...updatedAnnotation,
                          text,
                          ...(newPos ? { x: newPos.x, y: newPos.y } : {}),
                        };
                        setAnnotations((prev) =>
                          prev.map((ann) =>
                            ann._id === id || ann.id === id ? newAnnotation : ann
                          )
                        );
                        if (save && text && text.trim() !== "") {
                          saveAnnotationToMongoDB(newAnnotation, !!newPos);
                        } else if (save) {
                          setAnnotations((prev) =>
                            prev.filter((ann) => ann._id !== id && ann.id !== id)
                          );
                        }
                      }
                    }}
                  />
                )
            )}
        </div>

        {/* XZ */}
        <div className="flex-1 flex justify-center relative">
          <canvas
            ref={canvasXZ}
            width={dimensions.xz.width}
            height={dimensions.xz.height}
            onClick={(e) => handleCanvasClick(e, "XZ")}
            onWheel={(e) => handleWheel(e, "XZ")}
            onMouseDown={(e) => handleMouseDown(e, "XZ")}
            onMouseMove={(e) => {
              handleMouseMove(e);
              handleMouseMoveColor(e, "XZ");
            }}
            onMouseUp={handleMouseUp}
            onContextMenu={handleContextMenu}
            className="relative"
          />
          {showAnnotations &&
            annotations.map(
              (a) =>
                a.view === "XZ" &&
                a.slice === coords.y && (
                  <AnnotationTextBox
                    key={a._id || a.id}
                    annotation={{ ...a, _id: a._id ?? a.id }} // force _id to exist
                    zoomXY={zoomXZ}
                    panXY={panXZ}
                    canvasRef={canvasXZ as React.RefObject<HTMLCanvasElement>}
                    onUpdate={(id, text, newPos, save) => {
                      const updatedAnnotation = annotations.find(
                        (ann) => ann._id === id || ann.id === id
                      );
                      if (updatedAnnotation) {
                        const newAnnotation = {
                          ...updatedAnnotation,
                          text,
                          ...(newPos ? { x: newPos.x, y: newPos.y } : {}),
                        };
                        setAnnotations((prev) =>
                          prev.map((ann) =>
                            ann._id === id || ann.id === id ? newAnnotation : ann
                          )
                        );
                        if (save && text && text.trim() !== "") {
                          saveAnnotationToMongoDB(newAnnotation, !!newPos);
                        } else if (save) {
                          setAnnotations((prev) =>
                            prev.filter((ann) => ann._id !== id && ann.id !== id)
                          );
                        }
                      }
                    }}
                  />
                )
            )}
        </div>

        {/* YZ */}
        <div className="flex-1 flex justify-center relative">
          <canvas
            ref={canvasYZ}
            width={dimensions.yz.width}
            height={dimensions.yz.height}
            onClick={(e) => handleCanvasClick(e, "YZ")}
            onWheel={(e) => handleWheel(e, "YZ")}
            onMouseDown={(e) => handleMouseDown(e, "YZ")}
            onMouseMove={(e) => {
              handleMouseMove(e);
              handleMouseMoveColor(e, "YZ");
            }}
            onMouseUp={handleMouseUp}
            onContextMenu={handleContextMenu}
            className="relative"
          />
          {showAnnotations &&
            annotations.map(
              (a) =>
                a.view === "YZ" &&
                a.slice === coords.x && (
                  <AnnotationTextBox
                    key={a._id || a.id}
                    annotation={{ ...a, _id: a._id ?? a.id }} // force _id to exist 
                    zoomXY={zoomYZ}
                    panXY={panYZ}
                    canvasRef={canvasYZ as React.RefObject<HTMLCanvasElement>}
                    onUpdate={(id, text, newPos, save) => {
                      const updatedAnnotation = annotations.find(
                        (ann) => ann._id === id || ann.id === id
                      );
                      if (updatedAnnotation) {
                        const newAnnotation = {
                          ...updatedAnnotation,
                          text,
                          ...(newPos ? { x: newPos.x, y: newPos.y } : {}),
                        };
                        setAnnotations((prev) =>
                          prev.map((ann) =>
                            ann._id === id || ann.id === id ? newAnnotation : ann
                          )
                        );
                        if (save && text && text.trim() !== "") {
                          saveAnnotationToMongoDB(newAnnotation, !!newPos);
                        } else if (save) {
                          setAnnotations((prev) =>
                            prev.filter((ann) => ann._id !== id && ann.id !== id)
                          );
                        }
                      }
                    }}
                  />
                )
            )}
        </div>
      </div>

      <p className="absolute top-4 right-4 text-gray-500 text-sm">
        Zoom: {zoomXY.toFixed(2)}x {zoomXZ.toFixed(2)}x {zoomYZ.toFixed(2)}x
      </p>

      {activePixelColor && (
        <div className="absolute bottom-4 right-4 px-2 py-1 rounded-md text-sm opacity-85 bg-white dark:bg-gray-800">
          {activePixelColor.view}: {activePixelColor.color}
        </div>
      )}

      <AnnotationPanel
        isAnnotating={isAnnotating}
        showAnnotations={showAnnotations}
        onToggleAnnotating={() => {
          setIsAnnotating((prev) => !prev);
          setShowAnnotations((prev) => !prev);
        }}
        onToggleVisibility={() => setShowAnnotations((prev) => !prev)}
        onOpenModal={() => setShowModal(true)}
      />

      <MeasureToggleButton
        isMeasuring={isMeasuring}
        onToggle={handleToggleMeasureWrapper}
      />

      <XYZControls
        coords={coords}
        onChange={handleSlider}
        limits={{
          x: (brightfieldNumX || fluorescentNumX) - 1,
          y: (brightfieldNumY || fluorescentNumY) - 1,
          z: (brightfieldNumZ || fluorescentNumZ) - 1,
        }}
        onReset={handleReset}
      />

      <ViewControlPanel
        coords={coords}
        zoom={{ XY: zoomXY, XZ: zoomXZ, YZ: zoomYZ }}
        pan={{ XY: panXY, XZ: panXZ, YZ: panYZ }}
        setCoords={setCoords}
        setZoom={setZoom}
        setPan={setPan}
        canvasXY={canvasXY as React.RefObject<HTMLCanvasElement>}
        canvasXZ={canvasXZ as React.RefObject<HTMLCanvasElement>}
        canvasYZ={canvasYZ as React.RefObject<HTMLCanvasElement>}
        setErrorMessage={setErrorMessage}
        datasetId={datasetId}
      />

      <MediaControlPanel datasetId={datasetId} setErrorMessage={setErrorMessage} />

      {isMeasuring && (
        <p className="absolute bottom-20 left-20 text-white bg-black/60 px-2 py-1 rounded text-sm">
          Click twice in any plane (XY, XZ, YZ) to display a measurement in µm.
        </p>
      )}
    </div>
  ) : (
    <div className="h-full w-full p-4 flex items-center justify-center">
      <p className="text-red-500">Error: Please select a dataset to view.</p>
    </div>
  );
}