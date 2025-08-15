"use client";
import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  Plus,
} from "lucide-react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  ColumnDef,
  SortingState,
  flexRender,
} from "@tanstack/react-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useForm, FormProvider } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import DatasetFormPage1 from "@/components/admin/Dataset/DatasetFormPage1";
import { Institution, User, Dataset } from "@/lib/models";
import ManageUsersDialog from "./ManageUsersDialog";
import MediaManagementDialog from "./MediaManagementDialog";

const uploadDatasetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  institutionId: z.string().min(1, "Institution is required"),
  brightfield: z.any().optional(),
  fluorescent: z.any().optional(),
  alpha: z.any().optional(),
});

type UploadDatasetForm = z.infer<typeof uploadDatasetSchema>;

export default function Datasets() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isManageUsersOpen, setIsManageUsersOpen] = useState(false);
  const [isMediaManagementOpen, setIsMediaManagementOpen] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [selectedAssignedUsers, setSelectedAssignedUsers] = useState<string[]>(
    []
  );
  const [selectedInstitutions, setSelectedInstitutions] = useState<string[]>(
    []
  );

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin");
      const data = await response.json();
      setDatasets(data.datasets || []);
      setInstitutions(data.institutions || []);
      setUsers(data.users || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMedia = async (datasetId: string) => {
    try {
      const response = await fetch(`/api/media?dataset=${datasetId}`);
      if (!response.ok) throw new Error("Failed to fetch media");
      // Note: Media state is now managed by MediaManagementDialog
    } catch (error) {
      console.error("Error fetching media:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const columns: ColumnDef<Dataset>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 hover:bg-transparent"
        >
          <span className="mr-2">Name</span>
          {column.getIsSorted() === "asc" ? (
            <ArrowUp className="h-4 w-4" />
          ) : column.getIsSorted() === "desc" ? (
            <ArrowDown className="h-4 w-4" />
          ) : (
            <ChevronsUpDown className="h-4 w-4" />
          )}
        </Button>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
    },
    {
      accessorKey: "institutionId",
      header: "Institution",
      cell: ({ row }) => {
        const institution = institutions.find(
          (inst) =>
            inst._id?.toString() === row.original.institutionId?.toString()
        );
        return institution ? institution.name : "N/A";
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const dataset = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0 hover:bg-gray-200"
                style={{ display: "block !important" }}
                onClick={(e) => e.stopPropagation()}
              >
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEdit(dataset)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  handleDelete(dataset._id?.toString() || "", dataset.name)
                }
              >
                Delete
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleManageUsers(dataset)}>
                Manage Users
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleMediaManagement(dataset)}>
                Manage Media
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: datasets,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    initialState: { pagination: { pageSize: 10 } },
  });

  const datasetMethods = useForm<UploadDatasetForm>({
    resolver: zodResolver(uploadDatasetSchema),
    defaultValues: {
      name: "",
      description: "",
      institutionId: "",
      brightfield: null,
      fluorescent: null,
      alpha: null,
    },
  });

  const { reset: resetDataset } = datasetMethods;

  const handleEdit = (dataset: Dataset) => {
    setSelectedDataset(dataset);
    resetDataset({
      name: dataset.name,
      description: dataset.description || "",
      institutionId: dataset.institutionId
        ? dataset.institutionId.toString()
        : "",
      brightfield: null,
      fluorescent: null,
      alpha: null,
    });
    setIsUploadOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        const response = await fetch("/api/admin", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, action: "delete-dataset" }),
        });
        if (response.ok) {
          fetchData();
        } else {
          const errorData = await response.json();
          console.error("Failed to delete dataset:", errorData);
          alert(errorData.error || "Failed to delete dataset");
        }
      } catch (error) {
        console.error("Error deleting dataset:", error);
        alert("Error deleting dataset");
      }
    }
  };

  const handleManageUsers = (dataset: Dataset) => {
    setSelectedDataset(dataset);
    setSelectedAssignedUsers(dataset.assignedUsers || []);
    setSelectedInstitutions([dataset.institutionId?.toString() || ""]);
    setIsManageUsersOpen(true);
  };

  const handleMediaManagement = async (dataset: Dataset) => {
    setSelectedDataset(dataset);
    setIsMediaManagementOpen(true);
  };

  const handleRemoveUser = async (userId: string, datasetId: string) => {
    if (!userId || !datasetId) {
      alert("Invalid user or dataset ID");
      return;
    }

    if (
      confirm("Are you sure you want to remove this user from the dataset?")
    ) {
      try {
        await fetchData();
        const dataset = datasets.find((d) => d._id?.toString() === datasetId);
        if (!dataset) {
          const response = await fetch(`/api/admin?datasetId=${datasetId}`);
          if (!response.ok) {
            throw new Error("Dataset not found in database");
          }
          const data = await response.json();
          if (!data.dataset) {
            throw new Error("Dataset not found in database");
          }
        }

        const user = users.find((u) => u._id?.toString() === userId);
        if (!user || !user.email) {
          throw new Error("User or user email not found");
        }

        const updatedUserDatasets = (user.assignedDatasets || []).filter(
          (id) => id !== datasetId
        );
        const userResponse = await fetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "assign-datasets",
            email: user.email,
            datasets: updatedUserDatasets,
          }),
        });

        if (!userResponse.ok) {
          const errorData = await userResponse.json();
          console.error("Failed to update user datasets:", errorData);
          throw new Error(errorData.error || "Failed to update user datasets");
        }

        const updatedAssignedUsers = (dataset?.assignedUsers || []).filter(
          (id) => id !== userId
        );
        const datasetResponse = await fetch("/api/admin", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update-dataset",
            _id: datasetId,
            assignedUsers: updatedAssignedUsers,
          }),
        });

        if (!datasetResponse.ok) {
          const errorData = await datasetResponse.json();
          console.error("Failed to update dataset assigned users:", errorData);
          throw new Error(
            errorData.error || "Failed to update dataset assigned users"
          );
        }

        await fetchData();
        setSelectedAssignedUsers(updatedAssignedUsers);
      } catch (error) {
        console.error("Error removing user:", error);
        alert(`Error removing user from dataset: ${error}`);
      }
    }
  };

  const handleAssignUsersSubmit = async () => {
    if (!selectedDataset || !selectedDataset._id) {
      alert("No dataset selected");
      return;
    }

    try {
      const datasetResponse = await fetch("/api/admin", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-dataset",
          _id: selectedDataset._id.toString(),
          assignedUsers: selectedAssignedUsers,
        }),
      });

      if (!datasetResponse.ok) {
        const errorData = await datasetResponse.json();
        console.error("Failed to assign users to dataset:", errorData);
        throw new Error(errorData.error || "Failed to assign users to dataset");
      }

      const updatePromises = users.map(async (user) => {
        const shouldBeAssigned = selectedAssignedUsers.includes(
          user._id?.toString() || ""
        );
        const currentDatasets = user.assignedDatasets || [];
        const isCurrentlyAssigned = currentDatasets.includes(
          selectedDataset._id?.toString() || ""
        );

        if (shouldBeAssigned && !isCurrentlyAssigned) {
          return fetch("/api/admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "assign-datasets",
              email: user.email,
              datasets: [
                ...currentDatasets,
                selectedDataset._id?.toString() || "",
              ],
            }),
          });
        } else if (!shouldBeAssigned && isCurrentlyAssigned) {
          return fetch("/api/admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "assign-datasets",
              email: user.email,
              datasets: currentDatasets.filter(
                (id) => id !== selectedDataset._id?.toString()
              ),
            }),
          });
        }
        return Promise.resolve();
      });

      const responses = await Promise.all(updatePromises);
      for (const response of responses) {
        if (response && !response.ok) {
          const errorData = await response.json();
          console.error("Failed to update user datasets:", errorData);
          throw new Error(errorData.error || "Failed to update user datasets");
        }
      }

      await fetchData();
      setIsManageUsersOpen(false);
    } catch (error) {
      console.error("Error assigning users:", error);
      alert(`Error assigning users to dataset: ${error}`);
    }
  };

  const onUploadSubmit = async (data: UploadDatasetForm) => {
    try {
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("description", data.description || "");
      formData.append("institutionId", data.institutionId);
      if (data.brightfield) formData.append("brightfield", data.brightfield[0]);
      if (data.fluorescent) formData.append("fluorescent", data.fluorescent[0]);
      if (data.alpha) formData.append("alpha", data.alpha[0]);

      const response = await fetch("/api/upload-dataset", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Server response error:", errorData);
        throw new Error(
          `Server error: ${response.status} ${response.statusText} - ${errorData}`
        );
      }

      const result = await response.json();
      if (result.success) {
        fetchData();
        setIsUploadOpen(false);
        resetDataset();
      } else {
        console.error("Failed to upload dataset:", result.error);
        alert(result.error || "Failed to upload dataset");
      }
    } catch (error) {
      console.error("Error uploading dataset:", error instanceof Error ? error.message : "Unknown error");
      alert(`Error uploading dataset: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handleUserSelection = (userId: string) => {
    setSelectedAssignedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  if (loading) return <div className="p-4">Loading datasets...</div>;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <Input
          placeholder="Search datasets..."
          value={globalFilter ?? ""}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex space-x-2">
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> New Dataset
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {selectedDataset ? "Edit Dataset" : "New Dataset"}
                </DialogTitle>
              </DialogHeader>
              <FormProvider {...datasetMethods}>
                <DatasetFormPage1
                  institutions={institutions}
                  onSubmit={onUploadSubmit}
                />
              </FormProvider>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center">
                  No datasets found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
        <span className="text-sm">
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()}
        </span>
        <Select
          value={table.getState().pagination.pageSize.toString()}
          onValueChange={(value) => table.setPageSize(Number(value))}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select page size" />
          </SelectTrigger>
          <SelectContent>
            {[10, 20, 30, 50].map((pageSize) => (
              <SelectItem key={pageSize} value={pageSize.toString()}>
                Show {pageSize}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ManageUsersDialog
        isOpen={isManageUsersOpen}
        onOpenChange={setIsManageUsersOpen}
        selectedDataset={selectedDataset}
        selectedAssignedUsers={selectedAssignedUsers}
        selectedInstitutions={selectedInstitutions}
        users={users}
        institutions={institutions}
        handleRemoveUser={handleRemoveUser}
        handleAssignUsersSubmit={handleAssignUsersSubmit}
        handleUserSelection={handleUserSelection}
        handleManageUsers={handleManageUsers}
        setSelectedInstitutions={setSelectedInstitutions}
      />

      <MediaManagementDialog
        isOpen={isMediaManagementOpen}
        onOpenChange={setIsMediaManagementOpen}
        selectedDataset={selectedDataset}
        fetchMedia={fetchMedia}
      />
    </div>
  );
}
