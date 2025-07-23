import { Annotation } from "./useAnnotations";

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
}: AnnotationModalProps) {
  return (
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
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700"
          title="Close modal"
        >
          Close
        </button>
      </div>
    </div>
  );
}
