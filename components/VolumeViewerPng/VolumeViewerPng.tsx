"use client";

import React, { useEffect, useRef, useState } from "react";
import "@kitware/vtk.js/Rendering/Profiles/Volume";
import vtkFullScreenRenderWindow from "@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow";
import vtkVolume from "@kitware/vtk.js/Rendering/Core/Volume";
import vtkVolumeMapper from "@kitware/vtk.js/Rendering/Core/VolumeMapper";
import vtkImageData from "@kitware/vtk.js/Common/DataModel/ImageData";
import vtkPiecewiseFunction from "@kitware/vtk.js/Common/DataModel/PiecewiseFunction";
import vtkColorTransferFunction from "@kitware/vtk.js/Rendering/Core/ColorTransferFunction";
import vtkDataArray from "@kitware/vtk.js/Common/Core/DataArray";
import vtkPlane from "@kitware/vtk.js/Common/DataModel/Plane";
import { BlendMode } from "@kitware/vtk.js/Rendering/Core/VolumeMapper/Constants";

import ClippingControls from "./ClippingControls";
import RenderQualitySlider from "./RenderQualitySlider";
import ViewControls from "./ViewControls";
import OpacitySlider from "./OpacitySlider";
import ShaderSelector from "./ShaderSelector";

const VolumeViewerPng: React.FC<{
  brightfieldBlobUrl: string;
  datasetId: string;
  brightfieldNumZ: number;
  brightfieldNumY: number;
  brightfieldNumX: number;
  fluorescentNumZ: number;
  fluorescentNumY: number;
  fluorescentNumX: number;
}> = ({
  brightfieldBlobUrl,
  datasetId,
  brightfieldNumZ,
  brightfieldNumY,
  brightfieldNumX,
  fluorescentNumZ,
  fluorescentNumY,
  fluorescentNumX,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [clip, setClip] = useState({ x: 0, y: 0, z: 0 });
  const [quality, setQuality] = useState(1.5);
  const [opacityLevel, setOpacityLevel] = useState(0.05);
  const [volumeDims, setVolumeDims] = useState({ x: 600, y: 600, z: 527 });
  const [viewOrientation, setViewOrientation] = useState<string>("");
  const [blendMode, setBlendMode] = useState<string>("composite");
  const [loading, setLoading] = useState(true);

  const clipPlanes = useRef({
    planeX: vtkPlane.newInstance({ normal: [1, 0, 0], origin: [0, 0, 0] }),
    planeY: vtkPlane.newInstance({ normal: [0, 1, 0], origin: [0, 0, 0] }),
    planeZ: vtkPlane.newInstance({ normal: [0, 0, 1], origin: [0, 0, 0] }),
  });

  const renderWindowRef = useRef<any>(null);
  const mapperRef = useRef<any>(null);
  const opacityRef = useRef<any>(null);

  useEffect(() => {
    if (!mapperRef.current || !renderWindowRef.current) return;
    const mapper = mapperRef.current;
    switch (blendMode) {
      case "mip":
        mapper.setBlendMode(BlendMode.MAXIMUM_INTENSITY_BLEND);
        break;
      case "composite":
      default:
        mapper.setBlendMode(BlendMode.COMPOSITE_BLEND);
    }
    renderWindowRef.current.render();
  }, [blendMode]);

  useEffect(() => {
    const sliceCount = brightfieldNumZ || fluorescentNumZ;
    const slicePath = (i: number) =>
      `${brightfieldBlobUrl}/xy/${String(i).padStart(3, "0")}.png`;

    const loadStackAndRender = async () => {
      const imagePromises = Array.from({ length: sliceCount }, (_, z) => {
        return new Promise<ImageData>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous"; // optional, if needed
          img.src = slicePath(z);
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d")!;
            ctx.drawImage(img, 0, 0);
            resolve(ctx.getImageData(0, 0, img.width, img.height));
          };
          img.onerror = reject;
        });
      });

      const slices = await Promise.all(imagePromises);

      let xMin = Infinity,
        xMax = -1,
        yMin = Infinity,
        yMax = -1;
      slices.forEach((slice) => {
        const { width, height, data } = slice;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const alpha = data[idx + 3];
            if (alpha > 10) {
              if (x < xMin) xMin = x;
              if (x > xMax) xMax = x;
              if (y < yMin) yMin = y;
              if (y > yMax) yMax = y;
            }
          }
        }
      });

      const width = xMax - xMin + 1;
      const height = yMax - yMin + 1;
      const depth = sliceCount;

      setVolumeDims({ x: width, y: height, z: depth });

      const volumeData = new Uint8Array(width * height * depth * 4);
      slices.forEach((slice, z) => {
        const full = slice.data;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const srcIdx = ((y + yMin) * slice.width + (x + xMin)) * 4;
            const dstIdx = (z * width * height + y * width + x) * 4;
            volumeData.set(full.slice(srcIdx, srcIdx + 4), dstIdx);
          }
        }
      });

      const imageData = vtkImageData.newInstance();
      imageData.setDimensions([width, height, depth]);
      imageData.setSpacing([1, 1, 2]);

      const scalars = vtkDataArray.newInstance({
        name: "ImageScalars",
        numberOfComponents: 4,
        values: volumeData,
      });
      imageData.getPointData().setScalars(scalars);

      const mapper = vtkVolumeMapper.newInstance();
      mapper.setInputData(imageData);
      mapper.setSampleDistance(quality);
      mapper.setMaximumSamplesPerRay(1500);
      mapper.addClippingPlane(clipPlanes.current.planeX);
      mapper.addClippingPlane(clipPlanes.current.planeY);
      mapper.addClippingPlane(clipPlanes.current.planeZ);
      mapperRef.current = mapper;

      const volume = vtkVolume.newInstance();
      volume.setMapper(mapper);

      const opacity = vtkPiecewiseFunction.newInstance();
      opacity.addPoint(0, 0.0);
      opacity.addPoint(100, opacityLevel);
      opacity.addPoint(255, 1.0);
      opacityRef.current = opacity;

      const color = vtkColorTransferFunction.newInstance();
      color.addRGBPoint(0, 0.0, 0.0, 0.0);
      color.addRGBPoint(100, 0.8, 0.2, 0.2);
      color.addRGBPoint(255, 1.0, 1.0, 1.0);

      const property = volume.getProperty();
      property.setIndependentComponents(false);
      property.setRGBTransferFunction(0, color);
      property.setScalarOpacity(0, opacity);
      property.setInterpolationTypeToLinear();
      property.setShade(true);
      property.setAmbient(0.3);
      property.setDiffuse(0.6);
      property.setSpecular(0.2);
      property.setSpecularPower(10);

      containerRef.current!.innerHTML = "";

      const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
        container: containerRef.current!,
        // containerStyle: { height: "100%", width: "100%", position: "relative" },
        background: [1, 1, 1],
        containerStyle: {
          width: "100%",
          height: "100%",
          position: "relative",
          top: 0,
          left: 0,
          overflow: "hidden", // important
        },
      });

      const renderer = fullScreenRenderer.getRenderer();
      const renderWindow = fullScreenRenderer.getRenderWindow();

      renderer.addVolume(volume);

      renderer.resetCamera();
      renderWindow.render();
      renderWindowRef.current = renderWindow;
      setLoading(false);
    };

    loadStackAndRender();
  }, []);

  useEffect(() => {
    if (!opacityRef.current || !renderWindowRef.current) return;
    opacityRef.current.removeAllPoints();
    opacityRef.current.addPoint(0, 0.0);
    opacityRef.current.addPoint(100, opacityLevel);
    opacityRef.current.addPoint(255, 1.0);
    renderWindowRef.current.render();
  }, [opacityLevel]);

  useEffect(() => {
    const { x, y, z } = clip;
    clipPlanes.current.planeX.setOrigin([x, 0, 0]);
    clipPlanes.current.planeY.setOrigin([0, y, 0]);
    clipPlanes.current.planeZ.setOrigin([0, 0, z]);
    renderWindowRef.current?.render();
  }, [clip]);

  useEffect(() => {
    if (!renderWindowRef.current || !viewOrientation) return;

    const renderer = renderWindowRef.current.getRenderers()[0];
    const camera = renderer.getActiveCamera();
    const bounds = renderer.computeVisiblePropBounds();
    const center = [
      (bounds[0] + bounds[1]) / 2,
      (bounds[2] + bounds[3]) / 2,
      (bounds[4] + bounds[5]) / 2,
    ];

    switch (viewOrientation) {
      case "front":
        camera.setPosition(center[0], center[1], center[2] + 2800);
        camera.setViewUp([0, 1, 0]);
        break;
      case "back":
        camera.setPosition(center[0], center[1], center[2] - 2800);
        camera.setViewUp([0, 1, 0]);
        break;
      case "top":
        camera.setPosition(center[0], center[1] + 2800, center[2]);
        camera.setViewUp([0, 0, -1]);
        break;
      case "bottom":
        camera.setPosition(center[0], center[1] - 2800, center[2]);
        camera.setViewUp([0, 0, 1]);
        break;
      case "left":
        camera.setPosition(center[0] - 2800, center[1], center[2]);
        camera.setViewUp([0, 1, 0]);
        break;
      case "right":
        camera.setPosition(center[0] + 2300, center[1], center[2]);
        camera.setViewUp([0, 1, 0]);
        break;
    }

    camera.setFocalPoint(...center);
    renderer.resetCameraClippingRange();
    renderWindowRef.current.render();
  }, [viewOrientation]);

  const handleAutoFocus = () => {
    if (!renderWindowRef.current) return;

    const renderer = renderWindowRef.current.getRenderers()[0];
    const camera = renderer.getActiveCamera();
    const actors = renderer.getVolumes();

    if (!actors.length) return;

    const bounds = actors[0].getBounds();
    const center = [
      (bounds[0] + bounds[1]) / 2,
      (bounds[2] + bounds[3]) / 2,
      (bounds[4] + bounds[5]) / 2,
    ];

    const maxDim = Math.max(
      bounds[1] - bounds[0],
      bounds[3] - bounds[2],
      bounds[5] - bounds[4]
    );

    camera.setFocalPoint(...center);
    camera.setPosition(center[0], center[1], center[2] + maxDim * 2);
    camera.setViewUp([0, 1, 0]);

    renderer.resetCameraClippingRange();
    renderWindowRef.current.render();
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "87vh",
        overflow: "hidden", // prevent scroll
      }}
    >
      {/* Floating Controls */}

      {/* Render + Shader + Opacity - Top Left */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          background: "rgba(0,0,0,0.7)",
          borderRadius: 8,
          padding: 10,
          zIndex: 20,
        }}
      >
        <RenderQualitySlider quality={quality} setQuality={setQuality} />
        <OpacitySlider
          opacityLevel={opacityLevel}
          setOpacityLevel={setOpacityLevel}
        />
        <ShaderSelector blendMode={blendMode} setBlendMode={setBlendMode} />
      </div>

      {/* Clipping - Bottom Left */}
      <div
        style={{
          position: "absolute",
          bottom: 10,
          left: 10,
          background: "rgba(0,0,0,0.7)",
          borderRadius: 8,
          padding: 10,
          zIndex: 20,
          color: "white",
          fontSize: "14px",
          width: "240px",
          backdropFilter: "blur(4px)",
          boxShadow: "0 0 10px rgba(0,0,0,0.4)",
        }}
      >
        <ClippingControls clip={clip} setClip={setClip} max={volumeDims} />
      </div>

      {/* View Controls - Bottom Right */}
      <div
        style={{
          position: "absolute",
          bottom: 10,
          right: 10,
          background: "rgba(0,0,0,0.7)",
          borderRadius: 8,
          padding: 10,
          zIndex: 20,
        }}
      >
        <ViewControls
          setViewOrientation={setViewOrientation}
          handleAutoFocus={handleAutoFocus}
        />
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(6px)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            animation: "fadeIn 0.4s ease-in-out",
          }}
        >
          {/* Pulse + Spinner + BIV */}
          <div style={{ position: "relative", width: "80px", height: "80px" }}>
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                border: "5px solid #4caf50",
                borderTop: "5px solid transparent",
                animation: "spin 1.2s linear infinite",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "20px",
                left: "20px",
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor: "#4caf50",
                opacity: 0.3,
                animation: "pulse 1.6s ease-in-out infinite",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "22px",
                left: "22px",
                width: "36px",
                height: "36px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "#ffffff",
                opacity: 0.7,
                fontFamily: "Trajan, serif",
                letterSpacing: "1px",
              }}
            >
              BIV
            </div>
          </div>

          {/* Status Text */}
          <div
            style={{
              color: "#e0e0e0",
              fontSize: "1rem",
              marginTop: "1.25rem",
              fontWeight: 400,
              opacity: 0.85,
              letterSpacing: "0.5px",
            }}
          >
            Initializing Volume Viewer...
          </div>

          {/* CSS Animations */}
          <style>
            {`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.4); opacity: 0.6; }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}
          </style>
        </div>
      )}

      {/* VTK Canvas */}

      <div
        ref={containerRef}
        // style={{ width: "100%", height: "85vh", position: "relative" }}
        style={{
          width: "100%",
          height: "100vh",
          position: "absolute",
          top: 0,
          left: 0,
          overflow: "hidden",
        }}
      ></div>
    </div>
  );
};

export default VolumeViewerPng;
