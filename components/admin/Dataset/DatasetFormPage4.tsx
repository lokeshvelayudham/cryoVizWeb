"use client";

import { useState, useEffect } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Institution, User } from "@/lib/models";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DatasetFormPage4Props {
  institutions: Institution[];
  users: User[];
  onPrev: () => void;
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
}

export default function DatasetFormPage4({
  institutions,
  users,
  onPrev,
  onSubmit,
}: DatasetFormPage4Props) {
  const { control } = useFormContext();
  const [selectedInstitution, setSelectedInstitution] = useState<string | null>(
    null
  );
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

  useEffect(() => {
    if (selectedInstitution && users) {
      const filtered = users.filter(
        (user) => user.institutionId?.toString() === selectedInstitution
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers([]);
    }
  }, [selectedInstitution, users]);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold">Assign this Data to Users</h2>

      {/* Institution Dropdown */}
      <div>
        <label className="text-sm font-medium">Select Institution</label>
        <Controller
          control={control}
          name="institutionId"
          render={({ field }) => (
            <Select
              onValueChange={(value) => {
                field.onChange(value);
                setSelectedInstitution(value); // trigger filtering
              }}
              value={field.value || ""}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select an institution" />
              </SelectTrigger>
              <SelectContent>
                {institutions.map((institution) => (
                  <SelectItem
                    key={institution._id?.toString()}
                    value={institution._id?.toString() || ""}
                  >
                    {institution.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* User Checkbox List */}
      <div>
        <label className="text-sm font-medium">Assign to Users</label>
        <Controller
          control={control}
          name="assignedUsers"
          render={({ field }) => (
            <div className="mt-2 space-y-2">
              {filteredUsers.map((user) => {
                const id = user._id?.toString() || "";
                const isChecked = field.value?.includes(id);

                return (
                  <label key={id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      value={id}
                      checked={isChecked}
                      onChange={(e) => {
                        const newValue = e.target.checked
                          ? [...(field.value || []), id]
                          : (field.value || []).filter(
                              (val: string) => val !== id
                            );
                        field.onChange(newValue);
                      }}
                    />
                    <span>{user.name}</span>
                  </label>
                );
              })}
            </div>
          )}
        />
      </div>

      {/* Navigation Buttons */}
      <div className="flex space-x-2">
        <Button type="button" onClick={onPrev}>
          Previous
        </Button>
        <Button type="submit">Submit</Button>
      </div>
    </form>
  );
}
