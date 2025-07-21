"use client";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import XYZControls from "./XYZControls";
import MeasureToggleButton from "./MeasureTool";
import LoadingOverlay from "./LoadingOverlay";
import AnnotationPanel from "./Annotation/AnnotationPanel";
import AnnotationTextBox from "./Annotation/AnnotationTextBox";
import useAnnotations from "./Annotation/useAnnotations";
import useCanvas from "./useCanvas";

const NUM_Z = 165; // slicesXY (Z-axis slices)
const NUM_Y = 416; // slicesXZ (Y-axis slices)
const NUM_X = 1118; // slicesYZ (X-axis slices)

export default function OrthographicViewer() {
  const { theme } = useTheme();
  const { data: session, status } = useSession();
  const userEmail = session?.user?.email || null;
  const [coords, setCoords] = useState({
    x: Math.floor(NUM_X / 2),
    y: Math.floor(NUM_Y / 2),
    z: Math.floor(NUM_Z / 2),
  });

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  type Point = { x: number; y: number };
  type MeasureData = {
    points: Point[];
    lines: { p1: Point; p2: Point; dist: number }[];
  };

  const [measureData, setMeasureData] = useState<{
    XY: MeasureData;
    XZ: MeasureData;
    YZ: MeasureData;
  }>({
    XY: { points: [], lines: [] },
    XZ: { points: [], lines: [] },
    YZ: { points: [], lines: [] },
  });

  const micronsPerPixel = 0.5;
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [activePixelColor, setActivePixelColor] = useState<{
    view: "XY" | "XZ" | "YZ";
    color: string;
  } | null>(null);

  // Use the annotations hook
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
  } = useAnnotations(userEmail, setErrorMessage);

  // Use the canvas hook, including setters for pan and zoom
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
  } = useCanvas(theme, coords, measureData, setLoading, setErrorMessage, setCoords);

  // Sync activePixelColor from useCanvas
  useEffect(() => {
    setActivePixelColor(canvasActivePixelColor);
  }, [canvasActivePixelColor]);

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
    console.log("Annotation click:", {
      view,
      clientX: e.clientX,
      rectLeft: rect.left,
      panX: pan.x,
      zoom,
      imageX,
      clampedX,
    });

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
    };

    setAnnotations((prev) => [...prev, newAnnotation]);
  };

  const handleMeasureClick = (
    e: React.MouseEvent<HTMLCanvasElement>,
    view: "XY" | "XZ" | "YZ"
  ) => {
    if (!isMeasuring) return;

    const canvas = { XY: canvasXY, XZ: canvasXZ, YZ: canvasYZ }[view].current!;
    const rect = canvas.getBoundingClientRect();
    const pan = { XY: panXY, XZ: panXZ, YZ: panYZ }[view];
    const zoom = { XY: zoomXY, XZ: zoomXZ, YZ: zoomYZ }[view];

    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;
    const newPoint = { x, y };

    setMeasureData((prev) => {
      const viewData = prev[view];
      const updatedPoints = [...viewData.points, newPoint];

      if (updatedPoints.length % 2 === 0) {
        const p1 = updatedPoints[updatedPoints.length - 2];
        const p2 = newPoint;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy) * micronsPerPixel;

        return {
          ...prev,
          [view]: {
            points: updatedPoints,
            lines: [...viewData.lines, { p1, p2, dist }],
          },
        };
      }

      return {
        ...prev,
        [view]: {
          ...viewData,
          points: updatedPoints,
        },
      };
    });

    drawAll();
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

  const handleToggleMeasure = () => {
    setIsMeasuring((prev) => {
      const newVal = !prev;
      if (!newVal) {
        setMeasureData({
          XY: { points: [], lines: [] },
          XZ: { points: [], lines: [] },
          YZ: { points: [], lines: [] },
        });
        setTimeout(() => {
          drawAll();
        }, 0);
      }
      return newVal;
    });
  };

  const handleSlider = (axis: "x" | "y" | "z", value: number) => {
    setCoords((prev) => ({ ...prev, [axis]: value }));
  };

  const handleReset = () => {
    setCoords({
      x: Math.floor(NUM_X / 2),
      y: Math.floor(NUM_Y / 2),
      z: Math.floor(NUM_Z / 2),
    });
    // Reset pan and zoom via the canvas hook
    setPanXY({ x: 0, y: 0 });
    setPanXZ({ x: 0, y: 0 });
    setPanYZ({ x: 0, y: 0 });
    setZoomXY(1);
    setZoomXZ(1);
    setZoomYZ(1);
  };

  useEffect(() => {
    preloadImages();
  }, [preloadImages]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchAnnotations();
    } else {
      setAnnotations([]);
    }
  }, [status, fetchAnnotations]);

  useEffect(() => {
    drawAll();
  }, [drawAll]);

  return (
    <div className="h-full w-full p-4 overflow-hidden relative">
      {loading && <LoadingOverlay />}
      {errorMessage && (
        <div className="absolute top-12 left-12 bg-red-500/80 text-white px-4 py-2 rounded z-[1000]">
          {errorMessage}
        </div>
      )}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-4xl max-h-[80vh] overflow-auto">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Annotations
            </h2>
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
              <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-2">Text</th>
                  <th className="px-4 py-2">Plane</th>
                  <th className="px-4 py-2">Slice</th>
                  <th className="px-4 py-2">Instance</th>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">User</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {annotations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-2 text-center">
                      No annotations found
                    </td>
                  </tr>
                ) : (
                  annotations.map((ann) => (
                    <tr key={ann._id || ann.id} className="border-b dark:border-gray-700">
                      <td className="px-4 py-2">
                        {editingAnnotationId === (ann._id || ann.id) ? (
                          <input
                            type="text"
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="border rounded px-2 py-1 w-full dark:bg-gray-700 dark:text-gray-100"
                          />
                        ) : (
                          ann.text || "N/A"
                        )}
                      </td>
                      <td className="px-4 py-2">{ann.view}</td>
                      <td className="px-4 py-2">{ann.slice}</td>
                      <td className="px-4 py-2">{ann.instance}</td>
                      <td className="px-4 py-2">
                        {new Date(ann.datetime).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-2">{ann.user || "Unknown"}</td>
                      <td className="px-4 py-2 flex space-x-2">
                        {editingAnnotationId === (ann._id || ann.id) ? (
                          <>
                            <button
                              onClick={() => handleSaveEdit(ann._id || ann.id)}
                              className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-600"
                              title="Save annotation"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingAnnotationId(null)}
                              className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-600"
                              title="Cancel editing"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleEditAnnotation(ann._id || ann.id, ann.text)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-600"
                            title="Edit annotation"
                          >
                            Edit
                          </button>
                        )}
                        <button
                          onClick={() => deleteAnnotationFromMongoDB(ann._id || ann.id)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-600"
                          title="Delete annotation"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <button
              onClick={() => setShowModal(false)}
              className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700"
              title="Close modal"
            >
              Close
            </button>
          </div>
        </div>
      )}
      <div className="flex flex-col h-[90%]">
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
                a.view === "XY" && a.slice === coords.z && (
                  <AnnotationTextBox
                    key={a._id || a.id}
                    annotation={a}
                    zoomXY={zoomXY}
                    panXY={panXY}
                    canvasRef={canvasXY as React.RefObject<HTMLCanvasElement>}
                    onUpdate={(id, text, newPos, save) => {
                      console.log("AnnotationTextBox onUpdate:", { id, text, newPos, save });
                      const updatedAnnotation = annotations.find((ann) => ann._id === id || ann.id === id);
                      if (updatedAnnotation) {
                        const newAnnotation = {
                          ...updatedAnnotation,
                          text,
                          ...(newPos ? { x: newPos.x, y: newPos.y } : {}),
                        };
                        setAnnotations((prev) =>
                          prev.map((ann) => (ann._id === id || ann.id === id ? newAnnotation : ann))
                        );
                        if (save && text && text.trim() !== "") {
                          saveAnnotationToMongoDB(newAnnotation, !!newPos);
                        } else if (save) {
                          setAnnotations((prev) => prev.filter((ann) => ann._id !== id && ann.id !== id));
                        }
                      }
                    }}
                  />
                )
            )}
        </div>
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
                a.view === "XZ" && a.slice === coords.y && (
                  <AnnotationTextBox
                    key={a._id || a.id}
                    annotation={a}
                    zoomXY={zoomXZ}
                    panXY={panXZ}
                    canvasRef={canvasXZ as React.RefObject<HTMLCanvasElement>}
                    onUpdate={(id, text, newPos, save) => {
                      console.log("AnnotationTextBox onUpdate:", { id, text, newPos, save });
                      const updatedAnnotation = annotations.find((ann) => ann._id === id || ann.id === id);
                      if (updatedAnnotation) {
                        const newAnnotation = {
                          ...updatedAnnotation,
                          text,
                          ...(newPos ? { x: newPos.x, y: newPos.y } : {}),
                        };
                        setAnnotations((prev) =>
                          prev.map((ann) => (ann._id === id || ann.id === id ? newAnnotation : ann))
                        );
                        if (save && text && text.trim() !== "") {
                          saveAnnotationToMongoDB(newAnnotation, !!newPos);
                        } else if (save) {
                          setAnnotations((prev) => prev.filter((ann) => ann._id !== id && ann.id !== id));
                        }
                      }
                    }}
                  />
                )
            )}
        </div>
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
                a.view === "YZ" && a.slice === coords.x && (
                  <AnnotationTextBox
                    key={a._id || a.id}
                    annotation={a}
                    zoomXY={zoomYZ}
                    panXY={panYZ}
                    canvasRef={canvasYZ as React.RefObject<HTMLCanvasElement>}
                    onUpdate={(id, text, newPos, save) => {
                      console.log("AnnotationTextBox onUpdate:", { id, text, newPos, save });
                      const updatedAnnotation = annotations.find((ann) => ann._id === id || ann.id === id);
                      if (updatedAnnotation) {
                        const newAnnotation = {
                          ...updatedAnnotation,
                          text,
                          ...(newPos ? { x: newPos.x, y: newPos.y } : {}),
                        };
                        setAnnotations((prev) =>
                          prev.map((ann) => (ann._id === id || ann.id === id ? newAnnotation : ann))
                        );
                        if (save && text && text.trim() !== "") {
                          saveAnnotationToMongoDB(newAnnotation, !!newPos);
                        } else if (save) {
                          setAnnotations((prev) => prev.filter((ann) => ann._id !== id && ann.id !== id));
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
        onToggle={handleToggleMeasure}
      />
      <XYZControls
        coords={coords}
        onChange={handleSlider}
        limits={{ x: NUM_X - 1, y: NUM_Y - 1, z: NUM_Z - 1 }}
        onReset={handleReset}
      />
      {isMeasuring && (
        <p className="absolute bottom-20 left-20 text-white bg-black/60 px-2 py-1 rounded text-sm">
          Click twice in any plane (XY, XZ, YZ) to display a measurement in µm.
        </p>
      )}
    </div>
  );
}
