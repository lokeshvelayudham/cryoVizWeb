import { useCallback, useEffect, useState } from "react";
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
};

export default function useAnnotations(
  userEmail: string | null,
  setErrorMessage: (message: string | null) => void,
  datasetId: string
) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
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
      }));
      setAnnotations(fetchedAnnotations);
      console.log("Annotations fetched from MongoDB:", fetchedAnnotations.map(a => ({ _id: a._id, id: a.id, user: a.user, datasetId })));
    } catch (error) {
      console.error("Error fetching annotations from MongoDB:", error);
      setErrorMessage("Failed to load annotations. Please try again.");
    }
  }, [userEmail, setErrorMessage, datasetId]);

  const saveAnnotationToMongoDB = useCallback(async (annotation: Annotation, updateOnlyPosition: boolean = false, retryCount: number = 0) => {
    if (!userEmail) {
      console.error("Cannot save annotation: No authenticated user");
      setErrorMessage("Please log in to create or update annotations.");
      return;
    }

    if (!annotation.text || annotation.text.trim() === "") {
      console.log("Skipping save: Annotation text is empty", { id: annotation.id, user: userEmail });
      setAnnotations((prev) => prev.filter((ann) => ann.id !== annotation.id));
      return;
    }

    if (updateOnlyPosition && !/^[0-9a-fA-F]{24}$/.test(annotation._id || "")) {
      console.error("Invalid _id for update:", { _id: annotation._id, id: annotation.id, user: userEmail });
      setErrorMessage("Cannot update annotation: Invalid ID. Please try creating a new annotation.");
      return;
    }

    try {
      const payload = {
        _id: annotation._id,
        id: annotation.id,
        view: annotation.view,
        slice: annotation.slice,
        user: userEmail,
        text: annotation.text,
        instance: annotation.instance || 0,
        x: annotation.x,
        y: annotation.y,
        datetime: annotation.datetime || Date.now(),
        datasetId,
        status: annotation.status || "active",
      };

      console.log("Saving annotation:", { 
        method: updateOnlyPosition ? "PUT" : "POST", 
        _id: annotation._id, 
        id: annotation.id, 
        user: userEmail, 
        retryCount,
        text: annotation.text,
        datasetId,
      });

      const response = await fetch("/api/annotations", {
        method: updateOnlyPosition ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to ${updateOnlyPosition ? "update" : "save"} annotation: ${errorData.error || response.statusText}`);
      }

      if (!updateOnlyPosition) {
        const data = await response.json();
        console.log("POST response:", { _id: data._id, id: annotation.id });
        setAnnotations((prev) =>
          prev.map((ann) =>
            ann.id === annotation.id ? { ...ann, _id: data._id, datetime: payload.datetime, user: userEmail, datasetId } : ann
          )
        );
      }
      console.log(`Annotation ${updateOnlyPosition ? "updated" : "saved"} to MongoDB:`, { 
        _id: annotation._id, 
        id: annotation.id, 
        user: userEmail,
        datasetId,
      });
      setErrorMessage(null);
    } catch (error) {
      console.error(`Error ${updateOnlyPosition ? "updating" : "saving"} annotation to MongoDB:`, error, {
        _id: annotation._id,
        id: annotation.id,
        user: userEmail,
        datasetId,
      });
      if (updateOnlyPosition && (error as Error).message.includes("Annotation not found") && retryCount < 3) {
        console.log("Refetching annotations due to not found error, retry:", retryCount + 1);
        await fetchAnnotations();
        setTimeout(() => saveAnnotationToMongoDB(annotation, updateOnlyPosition, retryCount + 1), 1000);
      } else {
        setErrorMessage(`Failed to ${updateOnlyPosition ? "update" : "save"} annotation: ${(error as Error).message}`);
      }
    }
  }, [userEmail, setErrorMessage, fetchAnnotations, datasetId]);

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
    } catch (error) {
      console.error("Error deleting annotation from MongoDB:", error);
      setErrorMessage(`Failed to delete annotation: ${(error as Error).message}`);
    }
  }, [userEmail, setErrorMessage, annotations, datasetId]);

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
    }
    setEditingAnnotationId(null);
    setEditingText("");
  }, [annotations, editingText, saveAnnotationToMongoDB, deleteAnnotationFromMongoDB, datasetId]);

  useEffect(() => {
    if (userEmail) {
      fetchAnnotations();
    }
  }, [userEmail, fetchAnnotations]);

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
  };
}