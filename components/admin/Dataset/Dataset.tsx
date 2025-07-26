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
import DatasetFormPage2 from "@/components/admin/Dataset/DatasetFormPage2";
import DatasetFormPage3 from "@/components/admin/Dataset/DatasetFormPage3";
import DatasetFormPage4 from "@/components/admin/Dataset/DatasetFormPage4";
import { Institution, User, Dataset } from "@/lib/models";

const uploadDatasetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  institutionId: z.string().min(1, "Institution is required"),
  brightfield: z.any().optional(),
  fluorescent: z.any().optional(),
  alpha: z.any().optional(),
  voxels: z.number().optional().refine((val) => val === undefined || !isNaN(val), "Voxels must be a valid number"),
  thickness: z.number().optional().refine((val) => val === undefined || !isNaN(val), "Thickness must be a valid number"),
  pixelLengthUM: z.number().optional().refine((val) => val === undefined || !isNaN(val), "Pixel Length UM must be a valid number"),
  zSkip: z.number().optional().refine((val) => val === undefined || !isNaN(val), "Z Skip must be a valid number"),
  specimen: z.string().optional(),
  pi: z.string().optional(),
  dims3X: z.number().optional().refine((val) => val === undefined || !isNaN(val), "Dims3X must be a valid number"),
  dims3Y: z.number().optional().refine((val) => val === undefined || !isNaN(val), "Dims3Y must be a valid number"),
  dims3Z: z.number().optional().refine((val) => val === undefined || !isNaN(val), "Dims3Z must be a valid number"),
  dims2X: z.number().optional().refine((val) => val === undefined || !isNaN(val), "Dims2X must be a valid number"),
  dims2Y: z.number().optional().refine((val) => val === undefined || !isNaN(val), "Dims2Y must be a valid number"),
  dims2Z: z.number().optional().refine((val) => val === undefined || !isNaN(val), "Dims2Z must be a valid number"),
  imageDimsX: z.number().optional().refine((val) => val === undefined || !isNaN(val), "ImageDimsX must be a valid number"),
  imageDimsY: z.number().optional().refine((val) => val === undefined || !isNaN(val), "ImageDimsY must be a valid number"),
  imageDimsZ: z.number().optional().refine((val) => val === undefined || !isNaN(val), "ImageDimsZ must be a valid number"),
  liverTiff: z.any().optional(),
  tumorTiff: z.any().optional(),
  assignedUsers: z.array(z.string()).optional(),

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
  const [currentPage, setCurrentPage] = useState(1);
  const [showUsersOpen, setShowUsersOpen] = useState(false);
  const [selectedDatasetUsers, setSelectedDatasetUsers] = useState<User[]>([]);
  const [selectedAssignedUsers, setSelectedAssignedUsers] = useState<string[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin");
      const data = await response.json();
      const datasets = data.datasets || [];
      // Log datasets to identify invalid values
      datasets.forEach((dataset: Dataset, index: number) => {
        if (dataset.voxels !== undefined && typeof dataset.voxels !== "number") {
          console.warn(`Invalid voxels value in dataset ${index}:`, dataset);
        }
        if (dataset.thickness !== undefined && typeof dataset.thickness !== "number") {
          console.warn(`Invalid thickness value in dataset ${index}:`, dataset);
        }
        if (dataset.pixelLengthUM !== undefined && typeof dataset.pixelLengthUM !== "number") {
          console.warn(`Invalid pixelLengthUM value in dataset ${index}:`, dataset);
        }
        if (dataset.zSkip !== undefined && typeof dataset.zSkip !== "number") {
          console.warn(`Invalid zSkip value in dataset ${index}:`, dataset);
        }
        if (dataset.brightfieldNumZ !== undefined && typeof dataset.brightfieldNumZ !== "number") {
          console.warn(`Invalid brightfieldNumZ value in dataset ${index}:`, dataset);
        }
        if (dataset.brightfieldNumY !== undefined && typeof dataset.brightfieldNumY !== "number") {
          console.warn(`Invalid brightfieldNumY value in dataset ${index}:`, dataset);
        }
        if (dataset.brightfieldNumX !== undefined && typeof dataset.brightfieldNumX !== "number") {
          console.warn(`Invalid brightfieldNumX value in dataset ${index}:`, dataset);
        }
        if (dataset.fluorescentNumZ !== undefined && typeof dataset.fluorescentNumZ !== "number") {
          console.warn(`Invalid fluorescentNumZ value in dataset ${index}:`, dataset);
        }
        if (dataset.fluorescentNumY !== undefined && typeof dataset.fluorescentNumY !== "number") {
          console.warn(`Invalid fluorescentNumY value in dataset ${index}:`, dataset);
        }
        if (dataset.fluorescentNumX !== undefined && typeof dataset.fluorescentNumX !== "number") {
          console.warn(`Invalid fluorescentNumX value in dataset ${index}:`, dataset);
        }
      });
      setDatasets(datasets);
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
      accessorKey: "voxels",
      header: "Voxels",
      cell: ({ row }) => {
        const voxels = row.original.voxels;
        return typeof voxels === "number" && !isNaN(voxels) ? voxels.toFixed(3) : "N/A";
      },
    },
    {
      accessorKey: "thickness",
      header: "Thickness",
      cell: ({ row }) => {
        const thickness = row.original.thickness;
        return typeof thickness === "number" && !isNaN(thickness) ? thickness.toFixed(3) : "N/A";
      },
    },
    {
      accessorKey: "pixelLengthUM",
      header: "Pixel Length (UM)",
      cell: ({ row }) => {
        const pixelLengthUM = row.original.pixelLengthUM;
        return typeof pixelLengthUM === "number" && !isNaN(pixelLengthUM) ? pixelLengthUM.toFixed(1) : "N/A";
      },
    },
    {
      accessorKey: "zSkip",
      header: "Z Skip",
      cell: ({ row }) => {
        const zSkip = row.original.zSkip;
        return typeof zSkip === "number" && !isNaN(zSkip) ? zSkip.toString() : "N/A";
      },
    },
    {
      accessorKey: "specimen",
      header: "Specimen",
      cell: ({ row }) => row.original.specimen || "N/A",
    },
    {
      accessorKey: "pi",
      header: "PI",
      cell: ({ row }) => row.original.pi || "N/A",
    },
    {
      accessorKey: "imageDims",
      header: "Image Dims",
      cell: ({ row }) =>
        row.original.imageDims && typeof row.original.imageDims.x === "number" &&
        typeof row.original.imageDims.y === "number" && typeof row.original.imageDims.z === "number"
          ? `${row.original.imageDims.x}x${row.original.imageDims.y}x${row.original.imageDims.z}`
          : "N/A",
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
      voxels: undefined,
      thickness: undefined,
      pixelLengthUM: undefined,
      zSkip: undefined,
      specimen: "",
      pi: "",
      dims3X: undefined,
      dims3Y: undefined,
      dims3Z: undefined,
      dims2X: undefined,
      dims2Y: undefined,
      dims2Z: undefined,
      imageDimsX: undefined,
      imageDimsY: undefined,
      imageDimsZ: undefined,
      liverTiff: null,
      tumorTiff: null,
      assignedUsers: [],
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
      voxels: typeof dataset.voxels === "number" && !isNaN(dataset.voxels) ? dataset.voxels : undefined,
      thickness: typeof dataset.thickness === "number" && !isNaN(dataset.thickness) ? dataset.thickness : undefined,
      pixelLengthUM: typeof dataset.pixelLengthUM === "number" && !isNaN(dataset.pixelLengthUM) ? dataset.pixelLengthUM : undefined,
      zSkip: typeof dataset.zSkip === "number" && !isNaN(dataset.zSkip) ? dataset.zSkip : undefined,
      specimen: dataset.specimen || "",
      pi: dataset.pi || "",
      dims3X: typeof dataset.dims3?.x === "number" && !isNaN(dataset.dims3.x) ? dataset.dims3.x : undefined,
      dims3Y: typeof dataset.dims3?.y === "number" && !isNaN(dataset.dims3.y) ? dataset.dims3.y : undefined,
      dims3Z: typeof dataset.dims3?.z === "number" && !isNaN(dataset.dims3.z) ? dataset.dims3.z : undefined,
      dims2X: typeof dataset.dims2?.x === "number" && !isNaN(dataset.dims2.x) ? dataset.dims2.x : undefined,
      dims2Y: typeof dataset.dims2?.y === "number" && !isNaN(dataset.dims2.y) ? dataset.dims2.y : undefined,
      dims2Z: typeof dataset.dims2?.z === "number" && !isNaN(dataset.dims2.z) ? dataset.dims2.z : undefined,
      imageDimsX: typeof dataset.imageDims?.x === "number" && !isNaN(dataset.imageDims.x) ? dataset.imageDims.x : undefined,
      imageDimsY: typeof dataset.imageDims?.y === "number" && !isNaN(dataset.imageDims.y) ? dataset.imageDims.y : undefined,
      imageDimsZ: typeof dataset.imageDims?.z === "number" && !isNaN(dataset.imageDims.z) ? dataset.imageDims.z : undefined,
      liverTiff: null,
      tumorTiff: null,
      assignedUsers: dataset.assignedUsers || [],
    });
    setIsUploadOpen(true);
    setCurrentPage(1);
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
    const userIds = dataset.assignedUsers || [];
    const associatedUsers = users.filter((user) => userIds.includes(user._id?.toString() || ""));
    setSelectedDatasetUsers(associatedUsers);
    setShowUsersOpen(true);
  };

  const handleRemoveUser = async (userId: string, datasetId: string) => {
    if (confirm("Are you sure you want to remove this user from the dataset?")) {
      try {
        const response = await fetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "assign-datasets",
            email: users.find((u) => u._id?.toString() === userId)?.email || "",
            datasets: [datasetId],
          }),
        });
        if (response.ok) {
          fetchData();
          const updatedDataset = datasets.find((d) => d._id?.toString() === datasetId);
          if (updatedDataset) {
            const updatedUsers = users.filter((user) =>
              (updatedDataset.assignedUsers || []).includes(user._id?.toString() || "")
            );
            setSelectedDatasetUsers(updatedUsers);
          }
        } else {
          const errorData = await response.json();
          console.error("Failed to remove user:", errorData);
          alert(errorData.error || "Failed to remove user from dataset");
        }
      } catch (error) {
        console.error("Error removing user:", error);
        alert("Error removing user from dataset");
      }
    }
  };

  const handleAssignUsers = (dataset: Dataset) => {
    setSelectedDataset(dataset);
    setSelectedAssignedUsers(dataset.assignedUsers || []);
    setIsAssignUsersOpen(true);
  };

  const handleAssignUsersSubmit = async () => {
    if (!selectedDataset || !selectedDataset._id) return;

    try {
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-dataset",
          _id: selectedDataset._id.toString(),
          assignedUsers: selectedAssignedUsers,
        }),
      });
      const result = await response.json();
      if (response.ok) {
        fetchData();
        setIsAssignUsersOpen(false);
      } else {
        console.error("Failed to assign users:", result.error);
        alert(result.error || "Failed to assign users to dataset");
      }
    } catch (error) {
      console.error("Error assigning users:", error);
      alert("Error assigning users to dataset");
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
      if (data.liverTiff) formData.append("liverTiff", data.liverTiff[0]);
      if (data.tumorTiff) formData.append("tumorTiff", data.tumorTiff[0]);
      formData.append("voxels", data.voxels?.toString() || "");
      formData.append("thickness", data.thickness?.toString() || "");
      formData.append("pixelLengthUM", data.pixelLengthUM?.toString() || "");
      formData.append("zSkip", data.zSkip?.toString() || "");
      formData.append("specimen", data.specimen || "");
      formData.append("pi", data.pi || "");
      formData.append("dims3X", data.dims3X?.toString() || "");
      formData.append("dims3Y", data.dims3Y?.toString() || "");
      formData.append("dims3Z", data.dims3Z?.toString() || "");
      formData.append("dims2X", data.dims2X?.toString() || "");
      formData.append("dims2Y", data.dims2Y?.toString() || "");
      formData.append("dims2Z", data.dims2Z?.toString() || "");
      formData.append("imageDimsX", data.imageDimsX?.toString() || "");
      formData.append("imageDimsY", data.imageDimsY?.toString() || "");
      formData.append("imageDimsZ", data.imageDimsZ?.toString() || "");
      if (data.assignedUsers) {
        formData.append("assignedUsers", JSON.stringify(data.assignedUsers));
      }

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
        setCurrentPage(1);
      } else {
        console.error("Failed to upload dataset:", result.error);
        alert(result.error || "Failed to upload dataset");
      }
    } catch (error: any) {
      console.error("Error uploading dataset:", error.message);
      alert(`Error uploading dataset: ${error.message}`);
    }
  };

  const renderFormPage = () => {
    switch (currentPage) {
      case 1:
        return <DatasetFormPage1 institutions={institutions} onNext={() => setCurrentPage(2)} />;
      case 2:
        return <DatasetFormPage2 onNext={() => setCurrentPage(3)} onPrev={() => setCurrentPage(1)} />;
      case 3:
        return <DatasetFormPage3 onNext={() => setCurrentPage(4)} onPrev={() => setCurrentPage(2)} />;
      case 4:
        return <DatasetFormPage4 institutions={institutions} users={users} onPrev={() => setCurrentPage(3)} onSubmit={handleSubmit(onUploadSubmit)} />;
      default:
        return null;
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
                {renderFormPage()}
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
                // multiple
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