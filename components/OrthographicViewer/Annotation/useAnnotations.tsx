import { useCallback, useEffect, useState, useMemo } from "react";
import { ObjectId } from "mongodb";

export type Annotation = {
  _id?: string;
  id: string;
  view: "XY" | "XZ" | "YZ";
  slice: number;
  x: number;
  y: number;
  text: string;
  instance: number;
  datetime: number;
  user: string;
  datasetId: string;
  status: string;
  studyName?: string; // New field for study organization
};

export type Study = {
  _id: string;
  name: string;
  datasetId: string;
  user: string;
  createdAt: Date;
  annotationCount: number;
};

export default function useAnnotations(
  userEmail: string | null,
  setErrorMessage: (message: string | null) => void,
  datasetId: string
) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [studies, setStudies] = useState<Study[]>([]);
  const [selectedStudy, setSelectedStudy] = useState<Study | null>(null);
  const [viewMode, setViewMode] = useState<"studies" | "annotations">("studies");
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>("");

  const fetchAnnotations = useCallback(async () => {
    if (!userEmail) {
      console.log("No authenticated user, skipping fetchAnnotations");
      setAnnotations([]);
      return;
    }
    if (!datasetId) {
      console.error("Dataset ID is required for fetching annotations");
      setErrorMessage("Dataset ID is missing. Please ensure a dataset is selected.");
      return;
    }
    try {
      const response = await fetch(`/api/annotations?datasetId=${encodeURIComponent(datasetId)}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch annotations: ${response.statusText}`);
      }

      const data = await response.json();
      const fetchedAnnotations: Annotation[] = data.map((item: {
        _id: ObjectId;
        id: string;
        view: "XY" | "XZ" | "YZ";
        slice: number;
        x: number;
        y: number;
        text: string;
        instance: number;
        datetime: number;
        user: string;
        datasetId: string;
        status: string;
        studyName?: string;
      }) => ({
        _id: item._id?.toString() || "",
        id: item.id,
        view: item.view as "XY" | "XZ" | "YZ",
        slice: item.slice,
        x: item.x,
        y: item.y,
        text: item.text,
        instance: item.instance || 0,
        datetime: item.datetime || Date.now(),
        user: item.user || userEmail,
        datasetId: item.datasetId || datasetId,
        status: item.status || "active",
        studyName: item.studyName || "Default Study",
      }));
      setAnnotations(fetchedAnnotations);
      console.log("Annotations fetched from MongoDB:", fetchedAnnotations.map(a => ({ _id: a._id, id: a.id, user: a.user, datasetId })));
    } catch (error) {
      console.error("Error fetching annotations from MongoDB:", error);
      setErrorMessage("Failed to load annotations. Please try again.");
    }
  }, [userEmail, setErrorMessage, datasetId]);

  const fetchStudies = useCallback(async () => {
    if (!userEmail || !datasetId) return;
    
    try {
      const response = await fetch(`/api/studies?datasetId=${encodeURIComponent(datasetId)}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch studies: ${response.statusText}`);
      }
      
      const studiesData = await response.json();
      
      // Ensure Default Study exists in the fetched studies
      let studiesList = studiesData;
      const hasDefaultStudy = studiesData.some((study: Study) => study.name === "Default Study");
      
      if (!hasDefaultStudy) {
        // Create Default Study if it doesn't exist
        const defaultStudy: Study = {
          _id: `study_Default Study_${datasetId}`,
          name: "Default Study",
          datasetId,
          user: userEmail,
          createdAt: new Date(),
          annotationCount: annotations.filter(a => !a.studyName || a.studyName === "Default Study").length
        };
        studiesList = [defaultStudy, ...studiesData];
      }
      
      setStudies(studiesList);
      console.log("Studies fetched from API with Default Study:", studiesList);
    } catch (error) {
      console.error("Error fetching studies from API:", error);
      // Fallback: create studies from annotations if API fails
      const studyMap = new Map<string, { name: string; count: number; firstAnnotation: Annotation }>();
      
      annotations.forEach(annotation => {
        const studyName = annotation.studyName || "Default Study";
        if (studyMap.has(studyName)) {
          studyMap.get(studyName)!.count++;
        } else {
          studyMap.set(studyName, {
            name: studyName,
            count: 1,
            firstAnnotation: annotation
          });
        }
      });

      // Ensure Default Study exists if there are any annotations
      if (annotations.length > 0 && !studyMap.has("Default Study")) {
        studyMap.set("Default Study", {
          name: "Default Study",
          count: annotations.filter(a => !a.studyName || a.studyName === "Default Study").length,
          firstAnnotation: annotations[0]
        });
      }

      // If no studies exist at all, create a Default Study
      if (studyMap.size === 0) {
        studyMap.set("Default Study", {
          name: "Default Study",
          count: 0,
          firstAnnotation: {
            _id: "",
            id: "",
            view: "XY",
            slice: 0,
            x: 0,
            y: 0,
            text: "",
            instance: 0,
            datetime: Date.now(),
            user: userEmail,
            datasetId,
            status: "active",
            studyName: "Default Study"
          }
        });
      }

      const studiesList: Study[] = Array.from(studyMap.entries()).map(([name, data]) => ({
        _id: `study_${name}_${datasetId}`,
        name: data.name,
        datasetId,
        user: userEmail,
        createdAt: new Date(data.firstAnnotation.datetime),
        annotationCount: data.count
      }));

      setStudies(studiesList);
      console.log("Studies created from fallback:", studiesList);
    }
  }, [userEmail, datasetId, annotations]);

  const createStudy = useCallback(async (studyName: string) => {
    if (!userEmail || !datasetId) return;
    
    try {
      const response = await fetch("/api/studies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: studyName,
          datasetId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create study");
      }

      const newStudy = await response.json();
      console.log("Study created via API:", newStudy);
      
      setStudies(prev => [...prev, newStudy]);
      setSelectedStudy(newStudy);
      setViewMode("annotations");
    } catch (error) {
      console.error("Error creating study via API:", error);
      // Fallback: create study locally if API fails
      const newStudy: Study = {
        _id: `study_${studyName}_${datasetId}`,
        name: studyName,
        datasetId,
        user: userEmail,
        createdAt: new Date(),
        annotationCount: 0
      };
      
      setStudies(prev => [...prev, newStudy]);
      setSelectedStudy(newStudy);
      setViewMode("annotations");
    }
  }, [userEmail, datasetId]);

  const switchToStudy = useCallback((study: Study) => {
    setSelectedStudy(study);
    setViewMode("annotations");
  }, []);

  const switchToStudiesList = useCallback(() => {
    setSelectedStudy(null);
    setViewMode("studies");
  }, []);

  const getAnnotationsForStudy = useCallback((studyName: string) => {
    return annotations.filter(ann => ann.studyName === studyName);
  }, [annotations]);

  // Get current study annotations - this will be used for display
  const currentStudyAnnotations = useMemo(() => {
    if (!selectedStudy) return annotations; // Show all if no study selected
    return annotations.filter(ann => ann.studyName === selectedStudy.name);
  }, [annotations, selectedStudy]);

  const saveAnnotationToMongoDB = useCallback(async (annotation: Annotation, updateOnlyPosition: boolean = false, retryCount: number = 0) => {
    if (!userEmail) {
      console.error("Cannot save annotation: No authenticated user");
      setErrorMessage("Please log in to save annotations.");
      return;
    }

    try {
      const payload = {
        ...annotation,
        user: userEmail,
        datasetId: annotation.datasetId || datasetId,
        studyName: annotation.studyName || "Default Study",
        datetime: Date.now(),
      };

      const method = updateOnlyPosition ? "PUT" : "POST";
      const url = updateOnlyPosition ? "/api/annotations" : "/api/annotations";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to save annotation: ${errorData.error || response.statusText}`);
      }

      if (!updateOnlyPosition) {
        const savedAnnotation = await response.json();
        setAnnotations((prev) => [...prev, savedAnnotation]);
        console.log("Annotation saved to MongoDB:", savedAnnotation);
      } else {
        console.log("Annotation position updated in MongoDB:", payload);
      }

      setErrorMessage(null);
      
      // Refresh studies to update annotation counts
      setTimeout(() => fetchStudies(), 100);
      
    } catch (error) {
      console.error("Error saving annotation to MongoDB:", error);
      if (retryCount < 3) {
        console.log(`Retrying... Attempt ${retryCount + 1}`);
        setTimeout(() => saveAnnotationToMongoDB(annotation, updateOnlyPosition, retryCount + 1), 1000);
      } else {
        setErrorMessage(`Failed to save annotation: ${(error as Error).message}`);
      }
    }
  }, [userEmail, setErrorMessage, datasetId, fetchStudies]);

  const deleteAnnotationFromMongoDB = useCallback(async (annotationId: string) => {
    if (!userEmail) {
      console.error("Cannot delete annotation: No authenticated user");
      setErrorMessage("Please log in to delete annotations.");
      return;
    }

    try {
      const annotation = annotations.find((ann) => ann._id === annotationId || ann.id === annotationId);
      if (!annotation) {
        throw new Error("Annotation not found");
      }

      console.log("Deleting annotation:", { _id: annotation._id, id: annotation.id, user: userEmail, datasetId: annotation.datasetId });

      const response = await fetch("/api/annotations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: annotation._id, datasetId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to delete annotation: ${errorData.error || response.statusText}`);
      }

      setAnnotations((prev) => prev.filter((ann) => ann._id !== annotationId && ann.id !== annotationId));
      console.log("Annotation deleted from MongoDB:", { _id: annotation._id, id: annotation.id, datasetId });
      setErrorMessage(null);
      
      // Refresh studies to update annotation counts
      setTimeout(() => fetchStudies(), 100);
    } catch (error) {
      console.error("Error deleting annotation from MongoDB:", error);
      setErrorMessage(`Failed to delete annotation: ${(error as Error).message}`);
    }
  }, [userEmail, setErrorMessage, annotations, datasetId, fetchStudies]);

  const handleEditAnnotation = useCallback((id: string, text: string) => {
    setEditingAnnotationId(id);
    setEditingText(text);
  }, []);

  const handleSaveEdit = useCallback((id: string) => {
    const annotation = annotations.find((ann) => ann._id === id || ann.id === id);
    if (annotation) {
      const updatedAnnotation = { ...annotation, text: editingText, datetime: Date.now(), datasetId };
      setAnnotations((prev) =>
        prev.map((ann) => (ann._id === id || ann.id === id ? updatedAnnotation : ann))
      );
      if (editingText && editingText.trim() !== "") {
        saveAnnotationToMongoDB(updatedAnnotation, true);
      } else {
        setAnnotations((prev) => prev.filter((ann) => ann._id !== id && ann.id !== id));
        if (annotation._id) {
          deleteAnnotationFromMongoDB(annotation._id);
        }
      }
      
      // Refresh studies to update annotation counts
      setTimeout(() => fetchStudies(), 100);
    }
    setEditingAnnotationId(null);
    setEditingText("");
  }, [annotations, editingText, saveAnnotationToMongoDB, deleteAnnotationFromMongoDB, datasetId, fetchStudies]);

  // Fetch studies and annotations when component mounts
  useEffect(() => {
    if (userEmail && datasetId) {
      fetchStudies();
      fetchAnnotations();
    }
  }, [userEmail, datasetId, fetchStudies, fetchAnnotations]);

  return {
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
    handleEditAnnotation,
    handleSaveEdit,
    studies,
    selectedStudy,
    viewMode,
    setViewMode,
    switchToStudy,
    switchToStudiesList,
    getAnnotationsForStudy,
    createStudy,
    currentStudyAnnotations,
    fetchStudies,
  };
}