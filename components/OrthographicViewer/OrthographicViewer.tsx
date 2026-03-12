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
import { ModalitySwitcher, type Modality } from "@/components/ModalitySwitcher";

type Point = { x: number; y: number };
type MeasureData = {
  points: Point[];
  lines: { p1: Point; p2: Point; dist: number }[];
};

type ViewerProps = {
  brightfieldBlobUrl?: string;
  fluorescentBlobUrl?: string;
  datasetId: string;
  brightfieldNumZ?: number;
  brightfieldNumY?: number;
  brightfieldNumX?: number;
  fluorescentNumZ?: number;
  fluorescentNumY?: number;
  fluorescentNumX?: number;
};

export default function OrthographicViewer(props: ViewerProps) {
  const {
    brightfieldBlobUrl,
    fluorescentBlobUrl,
    datasetId,
    brightfieldNumZ,
    brightfieldNumY,
    brightfieldNumX,
    fluorescentNumZ,
    fluorescentNumY,
    fluorescentNumX,
  } = props;

  // Determine available modalities
  const hasBrightfield = Boolean(brightfieldBlobUrl && brightfieldNumZ);
  const hasFluorescent = Boolean(fluorescentBlobUrl && fluorescentNumZ);
  
  // Set default modality to the first available one
  const defaultModality: Modality = hasBrightfield ? "brightfield" : "fluorescent";
  const [currentModality, setCurrentModality] = useState<Modality>(defaultModality);

  // Get current modality data
  const currentBlobUrl = currentModality === "brightfield" ? brightfieldBlobUrl : fluorescentBlobUrl;
  const currentNumZ = currentModality === "brightfield" ? brightfieldNumZ : fluorescentNumZ;
  const currentNumY = currentModality === "brightfield" ? brightfieldNumY : fluorescentNumY;
  const currentNumX = currentModality === "brightfield" ? brightfieldNumX : fluorescentNumX;

  // 🔒 All hooks must be called unconditionally, at the top:
  const { theme } = useTheme();
  const { data: session, status } = useSession();
  const userEmail = session?.user?.email || null;

  const [coords, setCoords] = useState({
    x: Math.floor((currentNumX || 0) / 2),
    y: Math.floor((currentNumY || 0) / 2),
    z: Math.floor((currentNumZ || 0) / 2),
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
    setAnnotations,
    isAnnotating,
    setIsAnnotating,
    showAnnotations,
    setShowAnnotations,
    editingAnnotationId,
    setEditingAnnotationId,
    editingText,
    setEditingText,
    fetchAnnotations,
    saveAnnotationToMongoDB,
    deleteAnnotationFromMongoDB,
    handleSaveEdit,
    groups,
    selectedGroup,
    viewMode,
    switchToGroup,
    switchToGroupsList,
    createGroup,
    currentGroupAnnotations,
  } = useAnnotations(userEmail, setErrorMessage, datasetId);

  // Canvas logic
  const {
    canvasXY,
    canvasXZ,
    canvasYZ,
    dimensions,
    scaledDimensions, // Use scaled dimensions
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
    resetView,
  } = useCanvas(
    theme,
    coords,
    measureData,
    setLoading,
    setErrorMessage,
    setCoords,
    currentBlobUrl || "",
    currentNumZ || 0,
    currentNumY || 0,
    currentNumX || 0
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

  // Reset coordinates when modality changes
  useEffect(() => {
    setCoords({
      x: Math.floor((currentNumX || 0) / 2),
      y: Math.floor((currentNumY || 0) / 2),
      z: Math.floor((currentNumZ || 0) / 2),
    });
  }, [currentModality, currentNumX, currentNumY, currentNumZ]);



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
      groupName: selectedGroup?.name || "Default Group", // Include current group name
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
    resetView(); // Use the reset function from useCanvas
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
    <div className="h-full w-full p-4 overflow-hidden relative bg-white dark:bg-black">
      {loading && <LoadingOverlay />}
      {errorMessage && (
        <div className="absolute top-12 left-12 bg-red-500/80 text-white px-4 py-2 rounded z-[1000]">
          {errorMessage}
        </div>
      )}
      {showModal && (
        <AnnotationModal
          groups={groups || []}
          selectedGroup={selectedGroup}
          viewMode={viewMode}
          editingAnnotationId={editingAnnotationId}
          editingText={editingText}
          setEditingAnnotationId={setEditingAnnotationId}
          setEditingText={setEditingText}
          handleSaveEdit={handleSaveEdit}
          deleteAnnotationFromMongoDB={deleteAnnotationFromMongoDB}
          onClose={() => setShowModal(false)}
          setCoords={setCoords}
          switchToGroup={switchToGroup}
          switchToGroupsList={switchToGroupsList}
          createGroup={createGroup}
          currentGroupAnnotations={currentGroupAnnotations}
        />
      )}
      
      {/* Responsive container that fits all three views */}
      <div className="flex flex-col h-[90%] gap-2 overflow-hidden">
        {/* XY View - Takes more vertical space */}
        <div className="flex-1 flex justify-center items-center relative min-h-0 overflow-hidden bg-white dark:bg-black rounded-lg shadow-sm">
          <div className="relative" style={{ 
            width: scaledDimensions.xy.width, 
            height: scaledDimensions.xy.height 
          }}>
            <canvas
              ref={canvasXY}
              width={scaledDimensions.xy.width}
              height={scaledDimensions.xy.height}
              onClick={(e) => handleCanvasClick(e, "XY")}
              onWheel={(e) => handleWheel(e, "XY")}
              onMouseDown={(e) => handleMouseDown(e, "XY")}
              onMouseMove={(e) => {
                handleMouseMove(e);
                handleMouseMoveColor(e, "XY");
              }}
              onMouseUp={handleMouseUp}
              onContextMenu={handleContextMenu}
              className="block max-w-full max-h-full"
              style={{
                width: scaledDimensions.xy.width,
                height: scaledDimensions.xy.height
              }}
            />
            {showAnnotations &&
              (selectedGroup ? currentGroupAnnotations : annotations).map(
                (a: any) =>
                  a.view === "XY" &&
                  a.slice === coords.z && (
                    <AnnotationTextBox
                      key={a._id || a.id}
                      annotation={{ ...a, _id: a._id ?? a.id }}
                      zoomXY={zoomXY}
                      panXY={panXY}
                      canvasRef={canvasXY as React.RefObject<HTMLCanvasElement>}
                      currentGroupName={selectedGroup?.name || "Default Group"}
                      onUpdate={(id, text, newPos, save) => {
                        const updatedAnnotation = annotations.find(
                          (ann) => ann._id === id || ann.id === id
                        );
                        if (updatedAnnotation) {
                          const newAnnotation = {
                            ...updatedAnnotation,
                            text,
                            groupName: selectedGroup?.name || "Default Group", // Include group name
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

        {/* Bottom row for XZ and YZ views */}
        <div className="flex gap-2 h-1/3 min-h-0 overflow-hidden">
          {/* XZ View */}
          <div className="flex-1 flex justify-center items-center relative overflow-hidden bg-white dark:bg-black rounded-lg shadow-sm">
            <div className="relative" style={{ 
              width: scaledDimensions.xz.width, 
              height: scaledDimensions.xz.height 
            }}>
              <canvas
                ref={canvasXZ}
                width={scaledDimensions.xz.width}
                height={scaledDimensions.xz.height}
                onClick={(e) => handleCanvasClick(e, "XZ")}
                onWheel={(e) => handleWheel(e, "XZ")}
                onMouseDown={(e) => handleMouseDown(e, "XZ")}
                onMouseMove={(e) => {
                  handleMouseMove(e);
                  handleMouseMoveColor(e, "XZ");
                }}
                onMouseUp={handleMouseUp}
                onContextMenu={handleContextMenu}
                className="block max-w-full max-h-full"
                style={{
                  width: scaledDimensions.xz.width,
                  height: scaledDimensions.xz.height
                }}
              />
              {showAnnotations &&
                (selectedGroup ? currentGroupAnnotations : annotations).map(
                  (a: any) =>
                    a.view === "XZ" &&
                    a.slice === coords.y && (
                      <AnnotationTextBox
                        key={a._id || a.id}
                        annotation={{ ...a, _id: a._id ?? a.id }}
                        zoomXY={zoomXZ}
                        panXY={panXZ}
                        canvasRef={canvasXZ as React.RefObject<HTMLCanvasElement>}
                        currentGroupName={selectedGroup?.name || "Default Group"}
                        onUpdate={(id, text, newPos, save) => {
                          const updatedAnnotation = annotations.find(
                            (ann) => ann._id === id || ann.id === id
                          );
                          if (updatedAnnotation) {
                            const newAnnotation = {
                              ...updatedAnnotation,
                              text,
                              groupName: selectedGroup?.name || "Default Group", // Include group name
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

          {/* YZ View */}
          <div className="flex-1 flex justify-center items-center relative overflow-hidden bg-white dark:bg-black rounded-lg shadow-sm">
            <div className="relative" style={{ 
              width: scaledDimensions.yz.width, 
              height: scaledDimensions.yz.height 
            }}>
              <canvas
                ref={canvasYZ}
                width={scaledDimensions.yz.width}
                height={scaledDimensions.yz.height}
                onClick={(e) => handleCanvasClick(e, "YZ")}
                onWheel={(e) => handleWheel(e, "YZ")}
                onMouseDown={(e) => handleMouseDown(e, "YZ")}
                onMouseMove={(e) => {
                  handleMouseMove(e);
                  handleMouseMoveColor(e, "YZ");
                }}
                onMouseUp={handleMouseUp}
                onContextMenu={handleContextMenu}
                className="block max-w-full max-h-full"
                style={{
                  width: scaledDimensions.yz.width,
                  height: scaledDimensions.yz.height
                }}
              />
              {showAnnotations &&
                (selectedGroup ? currentGroupAnnotations : annotations).map(
                  (a: any) =>
                    a.view === "YZ" &&
                    a.slice === coords.x && (
                      <AnnotationTextBox
                        key={a._id || a.id}
                        annotation={{ ...a, _id: a._id ?? a.id }}
                        zoomXY={zoomYZ}
                        panXY={panYZ}
                        canvasRef={canvasYZ as React.RefObject<HTMLCanvasElement>}
                        currentGroupName={selectedGroup?.name || "Default Group"}
                        onUpdate={(id, text, newPos, save) => {
                          const updatedAnnotation = annotations.find(
                            (ann) => ann._id === id || ann.id === id
                          );
                          if (updatedAnnotation) {
                            const newAnnotation = {
                              ...updatedAnnotation,
                              text,
                              groupName: selectedGroup?.name || "Default Group", // Include group name
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
        </div>
      </div>

      {/* Enhanced zoom and scaling information */}
      <div className="absolute top-4 right-4 text-black dark:text-white text-sm bg-white/95 dark:bg-black/95 px-3 py-2 rounded-md">
        <div className="font-semibold mb-1">Canvas Scaling</div>
        <div>XY: {scaledDimensions.xy.scale.toFixed(3)}x ({scaledDimensions.xy.width}×{scaledDimensions.xy.height})</div>
        <div>XZ: {scaledDimensions.xz.scale.toFixed(3)}x ({scaledDimensions.xz.width}×{scaledDimensions.xz.height})</div>
        <div>YZ: {scaledDimensions.yz.scale.toFixed(3)}x ({scaledDimensions.yz.width}×{scaledDimensions.yz.height})</div>
        <div className="mt-2 font-semibold">Zoom Levels</div>
        <div>XY: {zoomXY.toFixed(2)}x | XZ: {zoomXZ.toFixed(2)}x | YZ: {zoomYZ.toFixed(2)}x</div>
        <button 
          onClick={handleReset}
          className="mt-2 px-2 py-1 bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 dark:text-black text-white text-xs rounded transition-colors"
        >
          Reset View
        </button>
      </div>

      {activePixelColor && (
        <div className="absolute bottom-4 right-4 px-2 py-1 rounded-md text-sm opacity-85 bg-white dark:bg-black">
          {activePixelColor.view}: {activePixelColor.color}
        </div>
      )}

      <AnnotationPanel
        isAnnotating={isAnnotating}
        showAnnotations={showAnnotations}
        showModal={showModal}
        onToggleAnnotating={() => {
          setIsAnnotating((prev) => !prev);
          // Automatically show annotations when enabling annotation mode
          if (!isAnnotating) {
            setShowAnnotations(true);
          }
        }}
        onToggleVisibility={() => setShowAnnotations((prev) => !prev)}
        onOpenModal={() => {
          setShowModal(true);
          // Automatically show annotations when opening the modal
          if (!showAnnotations) {
            setShowAnnotations(true);
          }
        }}
        onCloseModal={() => setShowModal(false)}
        groups={groups || []}
        selectedGroup={selectedGroup}
        viewMode={viewMode}
        onSwitchToGroup={switchToGroup}
      />

      <MeasureToggleButton
        isMeasuring={isMeasuring}
        onToggle={handleToggleMeasureWrapper}
      />

      <XYZControls
        coords={coords}
        onChange={handleSlider}
        limits={{
          x: (currentNumX || 1) - 1,
          y: (currentNumY || 1) - 1,
          z: (currentNumZ || 1) - 1,
        }}
        onReset={handleReset}
      />

      <ModalitySwitcher
        hasBrightfield={hasBrightfield}
        hasFluorescent={hasFluorescent}
        currentModality={currentModality}
        onModalityChange={setCurrentModality}
        className="absolute top-4 left-4 z-10"
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