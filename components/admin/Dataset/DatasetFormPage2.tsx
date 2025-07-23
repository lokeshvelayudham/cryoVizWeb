"use client";
import { useState, useEffect } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";

interface DatasetFormPage2Props {
  onNext: () => void;
  onPrev: () => void;
}

export default function DatasetFormPage2({ onNext, onPrev }: DatasetFormPage2Props) {
  const { control } = useFormContext();
  const [fields, setFields] = useState([{ id: 1, name: "" }]);

  useEffect(() => {
    // Register initial fields with react-hook-form
    fields.forEach((field) => {
      control.register(`${field.id}Name` as const);
      control.register(`${field.id}Tiff` as const);
    });
  }, [control, fields]);

  const addField = () => {
    const newId = fields.length + 1;
    setFields([...fields, { id: newId, name: "" }]);
    control.register(`${newId}Name` as const);
    control.register(`${newId}Tiff` as const);
  };

  return (
    <form className="space-y-4">
      <h2 className="text-lg font-semibold">Associated Datasets</h2>
      {fields.map((field) => (
        <div key={field.id} className="flex items-center space-x-2">
          <div className="flex-1">
            <label className="text-sm font-medium">{`Name`}</label>
            <Controller
              control={control}
              name={`${field.id}Name`}
              render={({ field }) => (
                <Input {...field} className="mt-1" placeholder={`e.g. ${"liver"}`} />
              )}
            />
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium">TIFF File</label>
            <Controller
              control={control}
              name={`${field.id}Tiff`}
              render={({ field: { onChange } }) => (
                <Input type="file" accept=".tif,.tiff" onChange={(e) => onChange(e.target.files)} className="mt-1" />
              )}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addField}
            className="mt-5 h-8 w-8 p-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <div className="flex space-x-2">
        <Button type="button" onClick={onPrev}>Previous</Button>
        <Button type="button" onClick={onNext}>Next</Button>
      </div>
    </form>
  );
}