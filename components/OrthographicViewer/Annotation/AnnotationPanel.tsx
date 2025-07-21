import { useEffect, useRef, useState } from "react";
import { Edit, Eye, List, Pen } from "lucide-react";

interface AnnotationPanelProps {
  isAnnotating: boolean;
  showAnnotations: boolean;
  onToggleAnnotating: () => void;
  onToggleVisibility: () => void;
  onOpenModal: () => void;
}

const AnnotationPanel: React.FC<AnnotationPanelProps> = ({
  isAnnotating,
  showAnnotations,
  onToggleAnnotating,
  onToggleVisibility,
  onOpenModal,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div style={{ position: "absolute", bottom: 110, left: 10, zIndex: 10 }} ref={menuRef}>
      <button
        onClick={() => setShowMenu((prev) => !prev)}
        className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-blue-600 hover:text-white transition-colors"
        title="Annotation options"
      >
        <Pen size={20} />
      </button>
      {showMenu && (
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-md py-2 w-48 z-[1000]"
        style={{
          position: "absolute",
          bottom: 40,
          left: 40,
          fontSize: "0.85rem",
        }}>
          <button
            onClick={() => {
              onToggleAnnotating();
              setShowMenu(false);
            }}
            className={`flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-500 hover:text-white transition-colors ${
              isAnnotating ? "bg-blue-100 dark:bg-blue-900" : ""
            }`}
            title={isAnnotating ? "Disable annotating" : "Enable annotating"}
          >
            <Edit size={16} className="mr-2" />
            {isAnnotating ? "Disable Annotating" : "Enable Annotating"}
          </button>
          <button
            onClick={() => {
              onToggleVisibility();
              setShowMenu(false);
            }}
            className={`flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-500 hover:text-white transition-colors ${
              showAnnotations ? "bg-blue-100 dark:bg-blue-900" : ""
            }`}
            title={showAnnotations ? "Hide annotations" : "Show annotations"}
          >
            <Eye size={16} className="mr-2" />
            {showAnnotations ? "Hide Annotations" : "Show Annotations"}
          </button>
          <button
            onClick={() => {
              onOpenModal();
              setShowMenu(false);
            }}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-500 hover:text-white transition-colors"
            title="View all annotations"
          >
            <List size={16} className="mr-2" />
            View All Annotations
          </button>
        </div>
      )}
    </div>
  );
};

export default AnnotationPanel;