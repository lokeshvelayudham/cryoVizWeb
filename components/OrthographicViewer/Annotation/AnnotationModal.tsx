import { Annotation } from "./useAnnotations";
import React, { useState, useRef } from "react";
import Draggable from "react-draggable"; // Assume this is available
import { Trash2 } from "lucide-react"; // Import Trash2 icon from lucide-react

interface AnnotationModalProps {
  annotations: Annotation[];
  editingAnnotationId: string | null;
  editingText: string;
  setEditingAnnotationId: (id: string | null) => void;
  setEditingText: (text: string) => void;
  handleEditAnnotation: (id: string, text: string) => void;
  handleSaveEdit: (id: string) => void;
  deleteAnnotationFromMongoDB: (id: string) => Promise<void>;
  onClose: () => void;
  setCoords: (coords: { x: number; y: number; z: number }) => void; // Added to navigate to slice
}

export default function AnnotationModal({
  annotations,
  editingAnnotationId,
  editingText,
  setEditingAnnotationId,
  setEditingText,
  handleEditAnnotation,
  handleSaveEdit,
  deleteAnnotationFromMongoDB,
  onClose,
  setCoords,
}: AnnotationModalProps) {
  const [selectedAnnotationIds, setSelectedAnnotationIds] = useState<string[]>([]);
  const [position, setPosition] = useState({ x: 20, y: 20 }); // Top-left position
  const dragRef = useRef(null);

  const handleDrag = (e: any, data: { x: number; y: number }) => {
    setPosition({ x: data.x, y: data.y });
  };

  const handleLabelDoubleClick = (id: string, currentText: string) => {
    setEditingAnnotationId(id);
    setEditingText(currentText || "");
  };

  const handleLabelClick = (view: "XY" | "XZ" | "YZ", slice: number) => {
    const axisMap: { [key in "XY" | "XZ" | "YZ"]: keyof { x: number; y: number; z: number } } = {
      XY: "z",
      XZ: "y",
      YZ: "x",
    };
    const axis = axisMap[view];
    setCoords((prev) => ({ ...prev, [axis]: slice }));
  };

  const handleCheckboxChange = (id: string) => {
    setSelectedAnnotationIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedAnnotationIds.length > 0) {
      await Promise.all(selectedAnnotationIds.map(id => deleteAnnotationFromMongoDB(id)));
      setSelectedAnnotationIds([]);
    }
  };

  return (
    <Draggable handle=".handle" position={position} onDrag={handleDrag} nodeRef={dragRef}>
      <div ref={dragRef} className="fixed z-[3000]">
        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg w-full max-w-4xl max-h-[80vh] overflow-auto relative handle border border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-medium mb-1 text-gray-900 dark:text-gray-100">
            Annotations
          </h2>
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-400">
              <tr>
                <th className="px-2 py-1">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedAnnotationIds(annotations.map(ann => ann._id || ann.id));
                      } else {
                        setSelectedAnnotationIds([]);
                      }
                    }}
                    checked={selectedAnnotationIds.length === annotations.length}
                  />
                </th>
                <th className="px-2 py-1">Label</th>
                <th className="px-2 py-1">Plane</th>
                <th className="px-2 py-1">Slice</th>
              </tr>
            </thead>
            <tbody>
              {annotations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-2 py-1 text-center text-gray-400">
                    No annotations
                  </td>
                </tr>
              ) : (
                annotations.map((ann) => (
                  <tr
                    key={ann._id || ann.id}
                    className={`border-b border-gray-200 dark:border-gray-700 ${selectedAnnotationIds.includes(ann._id || ann.id) ? "bg-gray-100 dark:bg-gray-800" : ""}`}
                    onClick={() => handleLabelClick(ann.view, ann.slice)}
                  >
                    <td className="px-2 py-1">
                      <input
                        type="checkbox"
                        checked={selectedAnnotationIds.includes(ann._id || ann.id)}
                        onChange={() => handleCheckboxChange(ann._id || ann.id)}
                      />
                    </td>
                    <td
                      className="px-2 py-1 cursor-pointer"
                      onDoubleClick={() => handleLabelDoubleClick(ann._id || ann.id, ann.text || "")}
                    >
                      {editingAnnotationId === (ann._id || ann.id) ? (
                        <input
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          onBlur={() => handleSaveEdit(ann._id || ann.id)}
                          onKeyPress={(e) => e.key === "Enter" && handleSaveEdit(ann._id || ann.id)}
                          autoFocus
                          className="border rounded px-1 py-0.5 w-full dark:bg-gray-700 dark:text-gray-100 text-sm"
                        />
                      ) : (
                        ann.text || "N/A"
                      )}
                    </td>
                    <td className="px-2 py-1 text-gray-400">{ann.view}</td>
                    <td className="px-2 py-1 text-gray-400">{ann.slice}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="flex justify-end mt-1">
            <button
              onClick={handleDeleteSelected}
              className="p-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 disabled:opacity-50"
              disabled={selectedAnnotationIds.length === 0}
              aria-label="Delete selected annotations"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={onClose}
              className="ml-2 px-2 py-0.5 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Draggable>
  );
}