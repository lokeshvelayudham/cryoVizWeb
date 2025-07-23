"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { View, X, Save, Download, List, Info, Eye } from "lucide-react";

interface View {
  _id?: string;
  id: string;
  name: string;
  coords: { x: number; y: number; z: number };
  zoom: { XY: number; XZ: number; YZ: number };
  pan: {
    XY: { x: number; y: number };
    XZ: { x: number; y: number };
    YZ: { x: number; y: number };
  };
  creator: string;
  createdAt: number;
  loadCount: number;
  loadStats: { user: string; count: number; lastLoad: number }[];
}

interface ViewControlPanelProps {
  coords: { x: number; y: number; z: number };
  zoom: { XY: number; XZ: number; YZ: number };
  pan: {
    XY: { x: number; y: number };
    XZ: { x: number; y: number };
    YZ: { x: number; y: number };
  };
  setCoords: (coords: { x: number; y: number; z: number }) => void;
  setZoom: (zoom: { XY: number; XZ: number; YZ: number }) => void;
  setPan: (pan: {
    XY: { x: number; y: number };
    XZ: { x: number; y: number };
    YZ: { x: number; y: number };
  }) => void;
  canvasXY: React.RefObject<HTMLCanvasElement>;
  canvasXZ: React.RefObject<HTMLCanvasElement>;
  canvasYZ: React.RefObject<HTMLCanvasElement>;
  setErrorMessage: (message: string | null) => void;
}

export default function ViewControlPanel({
  coords,
  zoom,
  pan,
  setCoords,
  setZoom,
  setPan,
  canvasXY,
  canvasXZ,
  canvasYZ,
  setErrorMessage,
}: ViewControlPanelProps) {
  const { data: session } = useSession();
  const userEmail = session?.user?.email || null;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [viewName, setViewName] = useState("");
  const [savedViews, setSavedViews] = useState<View[]>([]);
  const [selectedView, setSelectedView] = useState<View | null>(null);

  const fetchViews = async () => {
    if (!userEmail) return;
    try {
      const response = await fetch("/api/views", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to fetch views");
      const data = await response.json();
      setSavedViews(
        data.views.map((view: any) => ({ ...view, id: view._id.toString() })) ||
          []
      );
    } catch (error) {
      console.error("Error fetching views:", error);
      setErrorMessage("Failed to fetch saved views");
    }
  };

  const saveView = async () => {
    if (!userEmail) {
      setErrorMessage("Please log in to save views");
      return;
    }
    if (!viewName.trim()) {
      setErrorMessage("View name cannot be empty");
      return;
    }
    try {
      const response = await fetch("/api/views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: viewName,
          coords,
          zoom,
          pan,
          creator: userEmail,
          dataset: "Brain",
        }),
      });
      if (!response.ok) throw new Error("Failed to save view");
      const data = await response.json();
      console.log("Save view result:", data);
      setSavedViews((prev) => [
        ...prev,
        { ...data.view, id: data.view._id.toString() },
      ]);
      setViewName("");
      setIsSaveModalOpen(false);
    } catch (error) {
      console.error("Error saving view:", error);
      setErrorMessage("Failed to save view");
    }
  };

  const deleteView = async (id: string) => {
    if (!userEmail) {
      setErrorMessage("Please log in to delete views");
      return;
    }
    try {
      const response = await fetch(`/api/views?id=${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to delete view");
      const data = await response.json();
      console.log("Delete view result:", data);
      setSavedViews((prev) => prev.filter((view) => view.id !== id));
      if (selectedView?.id === id) setSelectedView(null);
    } catch (error) {
      console.error("Error deleting view:", error);
      setErrorMessage("Failed to delete view");
    }
  };

  const loadView = async (view: View) => {
    if (!userEmail) {
      setErrorMessage("Please log in to load views");
      return;
    }
    try {
      const response = await fetch(`/api/views/load?id=${view.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: userEmail }),
      });
      if (!response.ok) throw new Error("Failed to load view");
      const data = await response.json();
      console.log("Load view result:", data);
      setCoords(view.coords);
      setZoom(view.zoom);
      setPan(view.pan);
      setSavedViews((prev) =>
        prev.map((v) =>
          v.id === view.id
            ? {
                ...v,
                loadCount: data.view.loadCount,
                loadStats: data.view.loadStats,
              }
            : v
        )
      );
      setIsListModalOpen(false);
    } catch (error) {
      console.error("Error loading view:", error);
      setErrorMessage("Failed to load view");
    }
  };

  const downloadViews = () => {
    const canvases = [
      { canvas: canvasXY, name: `XY_slice_${coords.z}.png` },
      { canvas: canvasXZ, name: `XZ_slice_${coords.y}.png` },
      { canvas: canvasYZ, name: `YZ_slice_${coords.x}.png` },
    ];

    canvases.forEach(({ canvas, name }) => {
      const canvasEl = canvas.current;
      if (!canvasEl) return;
      const dataUrl = canvasEl.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = name;
      link.click();
      link.remove();
    });
    setIsDropdownOpen(false);
  };

  useEffect(() => {
    if (userEmail) fetchViews();
  }, [userEmail]);

  return (
    <>
      <div style={{ position: "absolute", bottom: 160, left: 10, zIndex: 10 }}>
        <button
          onClick={() => setIsDropdownOpen((prev) => !prev)}
          className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-blue-600 dark:hover:bg-red-400 dark:hover:text-white hover:text-white transition-colors group"
          title="View Controls"
        >
          <div className="relative">
            <Eye className="w-5 h-5 transition-transform duration-200 transform group-hover:scale-110 group-hover:-rotate-x-10 group-hover:-rotate-y-10" />
          </div>
        </button>
        {isDropdownOpen && (
          <div
            className="bg-white dark:bg-gray-800 shadow-lg rounded-md py-2 w-48 z-[1000]"
            style={{
              position: "absolute",
              bottom: 40,
              left: 40,
              fontSize: "0.85rem",
            }}
          >
            <ul className="text-sm text-gray-700 dark:text-gray-200">
              <li>
                <button
                  onClick={() => {
                    setIsSaveModalOpen(true);
                    setIsDropdownOpen(false);
                  }}
                  className="flex items-center w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 group"
                  title="Save current view"
                >
                  <div className="relative mr-2">
                    <Save className="w-4 h-4 transition-transform duration-200 transform group-hover:scale-110 group-hover:-rotate-x-10 group-hover:-rotate-y-10" />
                  </div>
                  Save View
                </button>
              </li>
              <li>
                <button
                  onClick={downloadViews}
                  className="flex items-center w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 group"
                  title="Download current views as PNG"
                >
                  <div className="relative mr-2">
                    <Download className="w-4 h-4 transition-transform duration-200 transform group-hover:scale-110 group-hover:-rotate-x-10 group-hover:-rotate-y-10" />
                  </div>
                  Download View
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setIsListModalOpen(true);
                    setIsDropdownOpen(false);
                  }}
                  className="flex items-center w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 group"
                  title="List saved views"
                >
                  <div className="relative mr-2">
                    <List className="w-4 h-4 transition-transform duration-200 transform group-hover:scale-110 group-hover:-rotate-x-10 group-hover:-rotate-y-10" />
                  </div>
                  List Views
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>
      {isSaveModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1000]">
          <div className="bg-white dark:bg-gray-900 p-4 rounded-lg w-full max-w-sm shadow-md transition-all duration-200">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-md font-medium text-gray-900 dark:text-gray-100">
                Save View
              </h2>
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              placeholder="Enter view name"
              className="border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 w-full text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 mb-3"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="px-3 py-1.5 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 transition-colors"
                title="Cancel"
              >
                Cancel
              </button>
              <button
                onClick={saveView}
                className="px-3 py-1.5 bg-green-500 text-white text-sm rounded-md hover:bg-green-600 transition-colors"
                title="Save view"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      {isListModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Saved Views
              </h2>
              <button
                onClick={() => setIsListModalOpen(false)}
                className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-600"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {savedViews.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No saved views
              </p>
            ) : (
              <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-400">
                  <tr>
                    <th className="px-2 py-1">Name</th>
                    <th className="px-2 py-1">Creator</th>
                    <th className="px-2 py-1">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {savedViews.map((view) => (
                    <tr key={view.id} className="border-b dark:border-gray-700">
                      <td className="px-2 py-1">{view.name}</td>
                      <td className="px-2 py-1">{view.creator}</td>
                      <td className="px-2 py-1 flex space-x-1">
                        <button
                          onClick={() => loadView(view)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-600 group"
                          title="Load view"
                        >
                          <div className="relative">
                            <View className="w-4 h-4 transition-transform duration-200 transform group-hover:scale-110 group-hover:-rotate-x-10 group-hover:-rotate-y-10" />
                          </div>
                        </button>
                        <button
                          onClick={() => deleteView(view.id)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-600 group"
                          title="Delete view"
                        >
                          <div className="relative">
                            <X className="w-4 h-4 transition-transform duration-200 transform group-hover:scale-110 group-hover:-rotate-x-10 group-hover:-rotate-y-10" />
                          </div>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedView(view);
                            setIsListModalOpen(false);
                          }}
                          className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-600 group"
                          title="View details"
                        >
                          <div className="relative">
                            <Info className="w-4 h-4 transition-transform duration-200 transform group-hover:scale-110 group-hover:-rotate-x-10 group-hover:-rotate-y-10" />
                          </div>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
      {selectedView && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[2000]">
          <div className="bg-white dark:bg-gray-900 p-4 rounded-lg w-full max-w-md shadow-md transition-all duration-200">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-md font-medium text-gray-900 dark:text-gray-100">
                View Details
              </h2>
              <button
                onClick={() => setSelectedView(null)}
                className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <p>
                <strong>Name:</strong> {selectedView.name}
              </p>
              <p>
                <strong>Creator:</strong> {selectedView.creator}
              </p>
              <p>
                <strong>Load Count:</strong> {selectedView.loadCount}
              </p>
            </div>
            <table className="w-full text-sm text-left text-gray-600 dark:text-gray-300 mt-3">
              <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-400">
                <tr>
                  <th className="px-2 py-1">User</th>
                  <th className="px-2 py-1">Loads</th>
                  <th className="px-2 py-1 min-w-[160px] whitespace-nowrap">
                    Last Load
                  </th>
                </tr>
              </thead>
              <tbody>
                {selectedView.loadStats.map((stat) => (
                  <tr
                    key={stat.user}
                    className="border-b border-gray-200 dark:border-gray-600"
                  >
                    <td className="px-2 py-1">{stat.user}</td>
                    <td className="px-2 py-1">{stat.count}</td>
                    <td className="px-2 py-1 min-w-[160px] whitespace-nowrap">
                      {new Date(stat.lastLoad).toLocaleString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              onClick={() => setSelectedView(null)}
              className="mt-3 px-3 py-1.5 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 transition-colors"
              title="Close details"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
