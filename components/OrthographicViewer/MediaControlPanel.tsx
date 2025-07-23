
"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Folder, X, Upload, List, Eye, Download, Trash2 } from "lucide-react";

interface MediaFile {
  id: string;
  name: string;
  tag: string;
  url: string;
}

interface MediaControlPanelProps {
  dataset: string;
  setErrorMessage: (message: string | null) => void;
}

export default function MediaControlPanel({ dataset, setErrorMessage }: MediaControlPanelProps) {
  const { data: session } = useSession();
  const userEmail = session?.user?.email || null;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);

  const fetchFiles = async () => {
    if (!userEmail) return;
    try {
      const response = await fetch(`/api/media?dataset=${dataset}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to fetch files");
      const data = await response.json();
      setMediaFiles(data.files || []);
    } catch (error: any) {
      console.error("Error fetching files:", error.message);
      setErrorMessage("Failed to fetch media files");
    }
  };

  const uploadFile = async () => {
    if (!userEmail) {
      setErrorMessage("Please log in to upload files");
      return;
    }
    if (!selectedFile) {
      setErrorMessage("Please select a file to upload");
      return;
    }
    try {
      const response = await fetch(`/api/media/sas?dataset=${dataset}&filename=${encodeURIComponent(selectedFile.name)}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error(`Failed to get SAS token: ${response.statusText}`);
      const { sasUrl, blobName } = await response.json();
      console.log("Uploading to:", sasUrl);

      // Upload using fetch
      const uploadResponse = await fetch(sasUrl, {
        method: "PUT",
        headers: {
          "x-ms-blob-type": "BlockBlob",
          "x-ms-blob-content-type": getContentType(selectedFile.name),
        },
        body: selectedFile,
      });
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Upload failed: ${errorText}`);
      }

      // Save metadata to MongoDB
      const metadataResponse = await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataset,
          filename: selectedFile.name,
          user: userEmail,
          format: selectedFile.name.split(".").pop()?.toLowerCase(),
          url: `https://bivlargefiles.blob.core.windows.net/media/${blobName}`,
          chunkSize: 261120,
          length: selectedFile.size,
        }),
      });
      if (!metadataResponse.ok) throw new Error("Failed to save metadata");

      console.log("File uploaded:", selectedFile.name);
      setSelectedFile(null);
      setIsUploadModalOpen(false);
      await fetchFiles();
    } catch (error: any) {
      console.error("Error uploading file:", error.message);
      setErrorMessage(`Failed to upload file: ${error.message}`);
    }
  };

  const deleteFile = async (filename: string) => {
    if (!userEmail) {
      setErrorMessage("Please log in to delete files");
      return;
    }
    try {
      const response = await fetch(`/api/media?dataset=${dataset}&filename=${encodeURIComponent(filename)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to delete file");
      console.log("File deleted:", filename);
      setMediaFiles((prev) => prev.filter((file) => file.name !== filename));
      if (previewFile?.name === filename) setPreviewFile(null);
    } catch (error: any) {
      console.error("Error deleting file:", error.message);
      setErrorMessage("Failed to delete file");
    }
  };

  const downloadFile = async (file: MediaFile) => {
    try {
      // Fetch the file as a blob
      const response = await fetch(file.url, {
        method: "GET",
      });
      if (!response.ok) throw new Error(`Failed to fetch file: ${response.statusText}`);
      const blob = await response.blob();
      
      // Create a temporary URL for the blob
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error: any) {
      console.error("Error downloading file:", error.message);
      setErrorMessage(`Failed to download file: ${error.message}`);
    }
  };

  const getContentType = (filename: string): string => {
    const ext = filename.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "txt": return "text/plain";
      case "mp4": return "video/mp4";
      case "jpeg":
      case "jpg": return "image/jpeg";
      case "png": return "image/png";
      case "pdf": return "application/pdf";
      case "docx": return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      default: return "application/octet-stream";
    }
  };

  const renderPreview = (file: MediaFile) => {
    const ext = file.tag.toLowerCase();
    if (ext === "txt") {
      return <iframe src={file.url} className="w-full h-64 border-0" />;
    } else if (ext === "mp4") {
      return (
        <video controls className="w-full h-auto max-h-64">
          <source src={file.url} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      );
    } else if (["jpeg", "png"].includes(ext)) {
      return <img src={file.url} alt={file.name} className="w-full h-auto max-h-64" />;
    } else if (ext === "pdf") {
      return <iframe src={file.url} className="w-full h-64 border-0" />;
    } else if (ext === "docx") {
      return <p className="text-sm text-gray-500 dark:text-gray-400">Preview not available for .docx files. Please download to view.</p>;
    }
    return <p className="text-sm text-gray-500 dark:text-gray-400">Preview not available</p>;
  };

  useEffect(() => {
    if (userEmail) fetchFiles();
  }, [userEmail]);

  return (
    <>
      <div style={{ position: "absolute", bottom: 210, left: 10, zIndex: 10 }}>
        <button
          onClick={() => setIsDropdownOpen((prev) => !prev)}
          className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-blue-600 dark:hover:bg-red-400 dark:hover:text-white hover:text-white transition-colors group"
          title="Media and Files"
        >
          <div className="relative">
            <Folder className="w-5 h-5 transition-transform duration-200 transform group-hover:scale-110 group-hover:-rotate-x-10 group-hover:-rotate-y-10" />
          </div>
        </button>
        {isDropdownOpen && (
          <div
            className="bg-white dark:bg-gray-800 shadow-lg rounded-md py-2 w-48 z-[1000]"
            style={{ position: "absolute", bottom: 40, left: 40, fontSize: "0.85rem" }}
          >
            <ul className="text-sm text-gray-700 dark:text-gray-200">
              <li>
                <button
                  onClick={() => {
                    setIsUploadModalOpen(true);
                    setIsDropdownOpen(false);
                  }}
                  className="flex items-center w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 group"
                  title="Upload a file"
                >
                  <div className="relative mr-2">
                    <Upload className="w-4 h-4 transition-transform duration-200 transform group-hover:scale-110 group-hover:-rotate-x-10 group-hover:-rotate-y-10" />
                  </div>
                  Upload File
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setIsListModalOpen(true);
                    setIsDropdownOpen(false);
                  }}
                  className="flex items-center w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 group"
                  title="List uploaded files"
                >
                  <div className="relative mr-2">
                    <List className="w-4 h-4 transition-transform duration-200 transform group-hover:scale-110 group-hover:-rotate-x-10 group-hover:-rotate-y-10" />
                  </div>
                  List Files
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1000]">
          <div className="bg-white dark:bg-gray-900 p-4 rounded-lg w-full max-w-sm shadow-md transition-all duration-200">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-md font-medium text-gray-900 dark:text-gray-100">Upload File</h2>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="file"
              accept=".txt,.mp4,.jpeg,.jpg,.pdf,.png"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 w-full text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 mb-3"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="px-3 py-1.5 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 transition-colors"
                title="Cancel"
              >
                Cancel
              </button>
              <button
                onClick={uploadFile}
                className="px-3 py-1.5 bg-green-500 text-white text-sm rounded-md hover:bg-green-600 transition-colors"
                title="Upload file"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
      {isListModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Media Files</h2>
              <button
                onClick={() => setIsListModalOpen(false)}
                className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-600"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {mediaFiles.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No uploaded files</p>
            ) : (
              <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-400">
                  <tr>
                    <th className="px-2 py-1">File Name</th>
                    <th className="px-2 py-1">Tag</th>
                    <th className="px-2 py-1">Tools</th>
                  </tr>
                </thead>
                <tbody>
                  {mediaFiles.map((file) => (
                    <tr key={file.id} className="border-b dark:border-gray-700">
                      <td className="px-2 py-1">{file.name}</td>
                      <td className="px-2 py-1">{file.tag}</td>
                      <td className="px-2 py-1 flex space-x-1">
                        <button
                          onClick={() => {
                            setPreviewFile(file);
                            setIsListModalOpen(false);
                          }}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-600"
                          title="View file"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => downloadFile(file)}
                          className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-600"
                          title="Download file"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteFile(file.name)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-600"
                          title="Delete file"
                        >
                          <Trash2 className="w-4 h-4" />
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
      {previewFile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[2000]">
          <div className="bg-white dark:bg-gray-900 p-4 rounded-lg w-full max-w-md shadow-md transition-all duration-200">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-md font-medium text-gray-900 dark:text-gray-100">{previewFile.name}</h2>
              <button
                onClick={() => setPreviewFile(null)}
                className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {renderPreview(previewFile)}
            <button
              onClick={() => setPreviewFile(null)}
              className="mt-3 px-3 py-1.5 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 transition-colors"
              title="Close preview"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
