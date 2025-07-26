"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Dataset, Institution } from "@/lib/models";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
} from "lucide-react";

export default function UsersDatasets() {
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const { data: adminData, isLoading, error } = useQuery({
    queryKey: ["adminData"],
    queryFn: async () => {
      const response = await fetch("/api/admin");
      if (!response.ok) throw new Error("Failed to fetch admin data");
      const result = await response.json();
      return result;
    },
    staleTime: 5 * 60 * 1000,
  });

  const userDatasets = adminData?.datasets || [];
  const institutions = adminData?.institutions || [];

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
      cell: ({ row }) => row.original.description || "No description",
    },
    {
      accessorKey: "institutionId",
      header: "Institution",
      cell: ({ row }) => {
        const institution = institutions.find(
          (inst: Institution) => inst._id?.toString() === row.original.institutionId?.toString()
        );
        return institution ? institution.name : "N/A";
      },
    },
  ];

  // Custom filter function to include institution name in global search
  const customFilterFn = (row: any, columnId: string, filterValue: string) => {
    const dataset = row.original;
    const institution = institutions.find(
      (inst: Institution) => inst._id?.toString() === dataset.institutionId?.toString()
    );
    const searchTerm = filterValue.toLowerCase();
    console.log("Filter Value:", filterValue, "Institution:", institution?.name); // Debug log
    return (
      dataset.name?.toLowerCase().includes(searchTerm) ||
      dataset.description?.toLowerCase().includes(searchTerm) ||
      (institution?.name?.toLowerCase().includes(searchTerm) || false)
    );
  };

  const table = useReactTable({
    data: userDatasets,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      globalFilter,
      sorting,
    },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    initialState: {
      pagination: {
        pageSize: 6,
      },
    },
    globalFilterFn: customFilterFn, // Apply custom filter function
  });

  if (isLoading) return <div>Loading datasets...</div>;
  if (error) return <div>Error loading datasets: {error.message}</div>;

  // Determine if filtered results are empty
  const filteredRows = table.getRowModel().rows;
  const isEmptyState = filteredRows.length === 0;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Datasets</h1>
      <div className="flex justify-between items-center mb-4">
        <Input
          placeholder="Search datasets..."
          value={globalFilter ?? ""}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        <Select
          onValueChange={(value) => {
            console.log("Selected Institution:", value); // Debug log
            setGlobalFilter(value === "all" ? "" : value);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Institution" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Institutions</SelectItem>
            {institutions.map((inst: Institution) => (
              <SelectItem key={inst._id?.toString() || ""} value={inst.name}>
                {inst.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRows.map((row) => {
          const institutionCell = row.getVisibleCells().find(
            (cell) => cell.column.id === "institutionId"
          );
          return (
            <Card key={row.id}>
              <CardHeader>
                <CardTitle>{row.getValue("name")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Description: {row.getValue("description")}</p>
                <p>Institution: {institutionCell ? flexRender(institutionCell.column.columnDef.cell, institutionCell.getContext()) : "N/A"}</p>
                <Link href={`/home?datasetId=${row.original._id?.toString() || ""}`}>
                  <Button className="mt-2 w-full">View Details</Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {isEmptyState && <p>No datasets available.</p>}
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
          onValueChange={(value) => {
            table.setPageSize(Number(value));
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select page size" />
          </SelectTrigger>
          <SelectContent>
            {[6, 12, 18, 24].map((pageSize) => (
              <SelectItem key={pageSize} value={pageSize.toString()}>
                Show {pageSize}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}