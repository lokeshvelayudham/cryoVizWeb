"use client";
import { useFormContext, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DatasetFormPage3Props {
  onNext: () => void;
  onPrev: () => void;
}

export default function DatasetFormPage3({ onNext, onPrev }: DatasetFormPage3Props) {
  const { control } = useFormContext();

  return (
    <form className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Voxels</label>
          <Controller
            control={control}
            name="voxels"
            render={({ field }) => <Input {...field} type="number" step="0.001" className="mt-1" />}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Thickness</label>
          <Controller
            control={control}
            name="thickness"
            render={({ field }) => <Input {...field} type="number" className="mt-1" />}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Pixel Length (UM)</label>
          <Controller
            control={control}
            name="pixelLengthUM"
            render={({ field }) => <Input {...field} type="number" step="0.1" className="mt-1" />}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Z Skip</label>
          <Controller
            control={control}
            name="zSkip"
            render={({ field }) => <Input {...field} type="number" className="mt-1" />}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Specimen</label>
          <Controller
            control={control}
            name="specimen"
            render={({ field }) => <Input {...field} className="mt-1" />}
          />
        </div>
        <div>
          <label className="text-sm font-medium">PI</label>
          <Controller
            control={control}
            name="pi"
            render={({ field }) => <Input {...field} className="mt-1" />}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Dims3 X</label>
          <Controller
            control={control}
            name="dims3X"
            render={({ field }) => <Input {...field} type="number" className="mt-1" />}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Dims3 Y</label>
          <Controller
            control={control}
            name="dims3Y"
            render={({ field }) => <Input {...field} type="number" className="mt-1" />}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Dims3 Z</label>
          <Controller
            control={control}
            name="dims3Z"
            render={({ field }) => <Input {...field} type="number" className="mt-1" />}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Dims2 X</label>
          <Controller
            control={control}
            name="dims2X"
            render={({ field }) => <Input {...field} type="number" className="mt-1" />}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Dims2 Y</label>
          <Controller
            control={control}
            name="dims2Y"
            render={({ field }) => <Input {...field} type="number" className="mt-1" />}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Dims2 Z</label>
          <Controller
            control={control}
            name="dims2Z"
            render={({ field }) => <Input {...field} type="number" className="mt-1" />}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Image Dims X</label>
          <Controller
            control={control}
            name="imageDimsX"
            render={({ field }) => <Input {...field} type="number" className="mt-1" />}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Image Dims Y</label>
          <Controller
            control={control}
            name="imageDimsY"
            render={({ field }) => <Input {...field} type="number" className="mt-1" />}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Image Dims Z</label>
          <Controller
            control={control}
            name="imageDimsZ"
            render={({ field }) => <Input {...field} type="number" className="mt-1" />}
          />
        </div>
      </div>
      <div className="flex space-x-2">
        <Button type="button" onClick={onPrev}>Previous</Button>
        <Button type="button" onClick={onNext}>Next</Button>
      </div>
    </form>
  );
}