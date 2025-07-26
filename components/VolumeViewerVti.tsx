"use client";

import React, { useEffect, useRef, useState } from "react";
import "@kitware/vtk.js/Rendering/Profiles/Volume";

import vtkFullScreenRenderWindow from "@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow";
import vtkXMLImageDataReader from "@kitware/vtk.js/IO/XML/XMLImageDataReader";
import vtkVolume from "@kitware/vtk.js/Rendering/Core/Volume";
import vtkVolumeMapper from "@kitware/vtk.js/Rendering/Core/VolumeMapper";
import vtkPiecewiseFunction from "@kitware/vtk.js/Common/DataModel/PiecewiseFunction";
import vtkPlane from "@kitware/vtk.js/Common/DataModel/Plane";

const VolumeViewer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  const [clipX, setClipX] = useState(0);
  const [clipY, setClipY] = useState(0);
  const [clipZ, setClipZ] = useState(80); // default Z-plane

  const planesRef = useRef<{ x: any; y: any; z: any } | null>(null);
  const renderWindowRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const renderVolume = async () => {
      const response = await fetch(
        "https://bivlargefiles.blob.core.windows.net/webviewer/volume1.vti"
      );
      const arrayBuffer = await response.arrayBuffer();

      const reader = vtkXMLImageDataReader.newInstance();
      reader.parseAsArrayBuffer(arrayBuffer);
      const imageData = reader.getOutputData(0);
      const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
        container: containerRef.current,
        background: [1, 1, 1],
      });

      const renderer = fullScreenRenderer.getRenderer();
      const renderWindow = fullScreenRenderer.getRenderWindow();
      renderWindowRef.current = renderWindow;

      const mapper = vtkVolumeMapper.newInstance();
      mapper.setInputData(imageData);

      // === Create clipping planes ===
      const planeX = vtkPlane.newInstance({ normal: [1, 0, 0], origin: [clipX, 0, 0] });
      const planeY = vtkPlane.newInstance({ normal: [0, 1, 0], origin: [0, clipY, 0] });
      const planeZ = vtkPlane.newInstance({ normal: [0, 0, 1], origin: [0, 0, clipZ] });

      planesRef.current = { x: planeX, y: planeY, z: planeZ };

      mapper.addClippingPlane(planeX);
      mapper.addClippingPlane(planeY);
      mapper.addClippingPlane(planeZ);

      const volume = vtkVolume.newInstance();
      volume.setMapper(mapper);

      const opacity = vtkPiecewiseFunction.newInstance();
      opacity.addPoint(5, 0.0);
      opacity.addPoint(30, 0.05);
      opacity.addPoint(80, 0.15);
      opacity.addPoint(150, 0.5);
      opacity.addPoint(255, 1.0);

      const property = volume.getProperty();
      property.setIndependentComponents(false);
      property.setScalarOpacity(0, opacity);
      property.setInterpolationTypeToLinear();
      property.setShade(true);
      property.setAmbient(0.4);
      property.setDiffuse(0.7);
      property.setSpecular(0.4);
      property.setSpecularPower(20);
      property.setScalarOpacityUnitDistance(0, 0.5);

      renderer.addVolume(volume);
      renderer.resetCamera();
      renderWindow.render();
    };

    renderVolume();
  }, []);

  // Handle clipping plane updates
  useEffect(() => {
    if (!planesRef.current || !renderWindowRef.current) return;

    planesRef.current.x.setOrigin([clipX, 0, 0]);
    planesRef.current.y.setOrigin([0, clipY, 0]);
    planesRef.current.z.setOrigin([0, 0, clipZ]);

    renderWindowRef.current.render();
  }, [clipX, clipY, clipZ]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <div ref={containerRef} style={{ flex: 1 }} />

      <div style={{ padding: "10px", display: "flex", gap: "20px", justifyContent: "center" }}>
        <label>
          X Clip:
          <input
            type="range"
            min="0"
            max="300"
            value={clipX}
            onChange={(e) => setClipX(Number(e.target.value))}
          />
        </label>
        <label>
          Y Clip:
          <input
            type="range"
            min="0"
            max="300"
            value={clipY}
            onChange={(e) => setClipY(Number(e.target.value))}
          />
        </label>
        <label>
          Z Clip:
          <input
            type="range"
            min="0"
            max="300"
            value={clipZ}
            onChange={(e) => setClipZ(Number(e.target.value))}
          />
        </label>
      </div>
    </div>
  );
};

export default VolumeViewer;