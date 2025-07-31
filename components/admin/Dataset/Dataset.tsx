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
  Trash2,
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
  const [isAssignUsersOpen, setIsAssignUsersOpen] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [showUsersOpen, setShowUsersOpen] = useState(false);
  const [selectedDatasetUsers, setSelectedDatasetUsers] = useState<User[]>([]);
  const [selectedAssignedUsers, setSelectedAssignedUsers] = useState<string[]>([]);

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
        const institution = institutions.find((inst) => inst._id?.toString() === row.original.institutionId?.toString());
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
              <DropdownMenuItem onClick={() => handleDelete(dataset._id?.toString() || "", dataset.name)}>
                Delete
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleShowUsers(dataset)}>
                Show Users
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAssignUsers(dataset)}>
                Assign Users
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

  const methods = useForm<UploadDatasetForm>({
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

  const { reset, handleSubmit } = methods;

  const handleEdit = (dataset: Dataset) => {
    setSelectedDataset(dataset);
    reset({
      name: dataset.name,
      description: dataset.description || "",
      institutionId: dataset.institutionId ? dataset.institutionId.toString() : "",
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

  const handleShowUsers = (dataset: Dataset) => {
    setSelectedDataset(dataset); // Ensure selectedDataset is set
    const userIds = dataset.assignedUsers || [];
    const associatedUsers = users.filter((user) => userIds.includes(user._id?.toString() || ""));
    setSelectedDatasetUsers(associatedUsers);
    setShowUsersOpen(true);
  };

  const handleRemoveUser = async (userId: string, datasetId: string) => {
    if (!userId || !datasetId) {
      alert("Invalid user or dataset ID");
      return;
    }

    if (confirm("Are you sure you want to remove this user from the dataset?")) {
      try {
        // Step 1: Ensure dataset exists by fetching latest data
        await fetchData();
        const dataset = datasets.find((d) => d._id?.toString() === datasetId);
        if (!dataset) {
          // Optional: Fetch dataset directly from server if not found in state
          const response = await fetch(`/api/admin?datasetId=${datasetId}`);
          if (!response.ok) {
            throw new Error("Dataset not found in database");
          }
          const data = await response.json();
          if (!data.dataset) {
            throw new Error("Dataset not found in database");
          }
        }

        // Step 2: Update the user's assignedDatasets to remove the datasetId
        const user = users.find((u) => u._id?.toString() === userId);
        if (!user || !user.email) {
          throw new Error("User or user email not found");
        }

        const updatedUserDatasets = (user.assignedDatasets || []).filter((id) => id !== datasetId);
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

        // Step 3: Update the dataset's assignedUsers to remove the userId
        const updatedAssignedUsers = (dataset?.assignedUsers || []).filter((id) => id !== userId);
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
          throw new Error(errorData.error || "Failed to update dataset assigned users");
        }

        // Refresh data and update UI
        await fetchData();
        const updatedDataset = datasets.find((d) => d._id?.toString() === datasetId);
        if (updatedDataset) {
          const updatedUsers = users.filter((user) =>
            (updatedDataset.assignedUsers || []).includes(user._id?.toString() || "")
          );
          setSelectedDatasetUsers(updatedUsers);
        } else {
          setSelectedDatasetUsers([]);
        }
      } catch (error) {
        console.error("Error removing user:", error);
        alert(`Error removing user from dataset: ${error}`);
      }
    }
  };

  const handleAssignUsers = (dataset: Dataset) => {
    setSelectedDataset(dataset);
    setSelectedAssignedUsers(dataset.assignedUsers || []);
    setIsAssignUsersOpen(true);
  };

  const handleAssignUsersSubmit = async () => {
    if (!selectedDataset || !selectedDataset._id) {
      alert("No dataset selected");
      return;
    }

    try {
      // Step 1: Update the dataset's assignedUsers
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

      // Step 2: Update each user's assignedDatasets
      const updatePromises = users.map(async (user) => {
        const shouldBeAssigned = selectedAssignedUsers.includes(user._id?.toString() || "");
        const currentDatasets = user.assignedDatasets || [];
        const isCurrentlyAssigned = currentDatasets.includes(selectedDataset._id.toString());

        if (shouldBeAssigned && !isCurrentlyAssigned) {
          // Add datasetId to user's assignedDatasets
          return fetch("/api/admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "assign-datasets",
              email: user.email,
              datasets: [...currentDatasets, selectedDataset._id.toString()],
            }),
          });
        } else if (!shouldBeAssigned && isCurrentlyAssigned) {
          // Remove datasetId from user's assignedDatasets
          return fetch("/api/admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "assign-datasets",
              email: user.email,
              datasets: currentDatasets.filter((id) => id !== selectedDataset._id.toString()),
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

      // Refresh data and close dialog
      await fetchData();
      setIsAssignUsersOpen(false);
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
        throw new Error(`Server error: ${response.status} ${response.statusText} - ${errorData}`);
      }

      const result = await response.json();
      if (result.success) {
        fetchData();
        setIsUploadOpen(false);
        reset();
      } else {
        console.error("Failed to upload dataset:", result.error);
        alert(result.error || "Failed to upload dataset");
      }
    } catch (error: any) {
      console.error("Error uploading dataset:", error.message);
      alert(`Error uploading dataset: ${error.message}`);
    }
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
                <DialogTitle>{selectedDataset ? "Edit Dataset" : "New Dataset"}</DialogTitle>
              </DialogHeader>
              <FormProvider {...methods}>
                <DatasetFormPage1 institutions={institutions} onSubmit={onUploadSubmit} />
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
                    {flexRender(header.column.columnDef.header, header.getContext())}
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
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
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

      {/* Dialog for showing users */}
      <Dialog open={showUsersOpen} onOpenChange={setShowUsersOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Users Associated with Dataset</DialogTitle>
          </DialogHeader>
          <div>
            {selectedDatasetUsers.length > 0 ? (
              <ul className="list-disc pl-5">
                {selectedDatasetUsers.map((user) => {
                  const institution = institutions.find(
                    (inst) => inst._id?.toString() === user.institutionId?.toString()
                  );
                  return (
                    <li key={user._id?.toString() || ""} className="flex items-center justify-between">
                      <span>
                        {user.name || user.email} -- Institution: {institution ? institution.name : "N/A"}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveUser(user._id?.toString() || "", selectedDataset?._id?.toString() || "")}
                        className="ml-2 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Remove user</span>
                      </Button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p>No users assigned to this dataset.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog for assigning users */}
      <Dialog open={isAssignUsersOpen} onOpenChange={setIsAssignUsersOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Users to Dataset</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Select Institution</label>
              <Select
                value={institutions.find((inst) => inst._id?.toString() === selectedDataset?.institutionId?.toString())?._id?.toString() || ""}
                onValueChange={(value) => {
                  const filteredUsers = users.filter((user) => user.institutionId?.toString() === value);
                  setSelectedAssignedUsers(filteredUsers.map((user) => user._id?.toString() || ""));
                }}
              >
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Select an institution" />
                </SelectTrigger>
                <SelectContent>
                  {institutions.map((institution) => (
                    <SelectItem key={institution._id?.toString() || ""} value={institution._id?.toString() || ""}>
                      {institution.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Select Users</label>
              <Select
                value={selectedAssignedUsers.join(',')}
                onValueChange={(values) => setSelectedAssignedUsers(values.split(',') as string[])}
              >
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Select users" />
                </SelectTrigger>
                <SelectContent>
                  {users
                    .filter((user) => user.institutionId?.toString() === selectedDataset?.institutionId?.toString())
                    .map((user) => (
                      <SelectItem key={user._id?.toString() || ""} value={user._id?.toString() || ""}>
                        {user.name || user.email}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAssignUsersSubmit}>Assign Users</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}