// "use client"

// import * as React from "react"
// import {
//   closestCenter,
//   DndContext,
//   KeyboardSensor,
//   MouseSensor,
//   TouchSensor,
//   useSensor,
//   useSensors,
//   type DragEndEvent,
//   type UniqueIdentifier,
// } from "@dnd-kit/core"
// import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
// import {
//   arrayMove,
//   SortableContext,
//   useSortable,
//   verticalListSortingStrategy,
// } from "@dnd-kit/sortable"
// import { CSS } from "@dnd-kit/utilities"
// import {
//   IconChevronDown,
//   IconChevronLeft,
//   IconChevronRight,
//   IconChevronsLeft,
//   IconChevronsRight,
//   IconDotsVertical,
//   IconGripVertical,
// } from "@tabler/icons-react"
// import {
//   ColumnDef,
//   ColumnFiltersState,
//   flexRender,
//   getCoreRowModel,
//   getFacetedRowModel,
//   getFacetedUniqueValues,
//   getFilteredRowModel,
//   getPaginationRowModel,
//   getSortedRowModel,
//   Row,
//   SortingState,
//   useReactTable,  
//   VisibilityState,
// } from "@tanstack/react-table"
// import { z } from "zod"

// import { useIsMobile } from "@/hooks/use-mobile"
// import { useDashboardData } from "@/hooks/use-dashboard-data"
// import { Badge } from "@/components/ui/badge"
// import { Button } from "@/components/ui/button"
// import {
//   ChartConfig,
// } from "@/components/ui/chart"
// import { Checkbox } from "@/components/ui/checkbox"
// import {
//   Drawer,
//   DrawerClose,
//   DrawerContent,
//   DrawerDescription,
//   DrawerFooter,
//   DrawerHeader,
//   DrawerTitle,
//   DrawerTrigger,
// } from "@/components/ui/drawer"
// import {
//   DropdownMenu,
//   DropdownMenuCheckboxItem,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select"
// import { Separator } from "@/components/ui/separator"
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table"
// import {
//   Tabs,
//   TabsContent,
//   TabsList,
//   TabsTrigger,
// } from "@/components/ui/tabs"
// import { RefreshCw, Activity, Users, Database, Upload, User, Calendar, CheckCircle, Clock, AlertCircle, Columns, Plus } from "lucide-react"
// import { useState } from "react"

// // Updated schema for real project data
// export const schema = z.object({
//   id: z.string(),
//   name: z.string(),
//   type: z.string(),
//   status: z.string(),
//   assignedTo: z.string(),
//   progress: z.number(),
//   lastUpdated: z.string(),
//   priority: z.string(),
//   description: z.string().optional(),
// })

// // Create a separate component for the drag handle
// function DragHandle({ id }: { id: string }) {
//   const { attributes, listeners } = useSortable({
//     id,
//   })

//   return (
//     <Button
//       {...attributes}
//       {...listeners}
//       variant="ghost"
//       size="icon"
//       className="text-muted-foreground size-7 hover:bg-transparent"
//     >
//       <IconGripVertical className="text-muted-foreground size-3" />
//       <span className="sr-only">Drag to reorder</span>
//     </Button>
//   )
// }

// const columns: ColumnDef<z.infer<typeof schema>>[] = [
//   {
//     id: "drag",
//     header: () => null,
//     cell: ({ row }) => <DragHandle id={row.original.id} />,
//   },
//   {
//     id: "select",
//     header: ({ table }) => (
//       <div className="flex items-center justify-center">
//         <Checkbox
//           checked={
//             table.getIsAllPageRowsSelected() ||
//             (table.getIsSomePageRowsSelected() && "indeterminate")
//           }
//           onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
//           aria-label="Select all"
//         />
//       </div>
//     ),
//     cell: ({ row }) => (
//       <div className="flex items-center justify-center">
//         <Checkbox
//           checked={row.getIsSelected()}
//           onCheckedChange={(value) => row.toggleSelected(!!value)}
//           aria-label="Select row"
//         />
//       </div>
//     ),
//     enableSorting: false,
//     enableHiding: false,
//   },
//   {
//     accessorKey: "name",
//     header: "Project Name",
//     cell: ({ row }) => {
//       return <TableCellViewer item={row.original} />
//     },
//     enableHiding: false,
//   },
//   {
//     accessorKey: "type",
//     header: "Project Type",
//     cell: ({ row }) => (
//       <div className="w-32">
//         <Badge variant="outline" className="text-muted-foreground px-1.5">
//           {row.original.type}
//         </Badge>
//       </div>
//     ),
//   },
//   {
//     accessorKey: "status",
//     header: "Status",
//     cell: ({ row }) => (
//       <Badge variant="outline" className="text-muted-foreground px-1.5">
//         {row.original.status === "Completed" ? (
//           <CheckCircle className="h-3 w-3 text-muted-foreground mr-1" />
//         ) : row.original.status === "In Progress" ? (
//           <Clock className="h-3 w-3 text-muted-foreground mr-1" />
//         ) : (
//           <AlertCircle className="h-3 w-3 text-muted-foreground mr-1" />
//         )}
//         {row.original.status}
//       </Badge>
//     ),
//   },
//   {
//     accessorKey: "assignedTo",
//     header: "Assigned To",
//     cell: ({ row }) => (
//       <div className="flex items-center gap-2">
//         <User className="h-4 w-4 text-muted-foreground" />
//         <span>{row.original.assignedTo}</span>
//       </div>
//     ),
//   },
//   {
//     accessorKey: "progress",
//     header: "Progress",
//     cell: ({ row }) => (
//       <div className="flex items-center gap-2">
//         <div className="flex-1 bg-muted rounded-full h-2">
//           <div
//             className="bg-primary h-2 rounded-full transition-all duration-300"
//             style={{ width: `${row.original.progress}%` }}
//           />
//         </div>
//         <span className="text-sm text-muted-foreground w-12 text-right">
//           {row.original.progress}%
//         </span>
//       </div>
//     ),
//   },
//   {
//     accessorKey: "lastUpdated",
//     header: "Last Updated",
//     cell: ({ row }) => (
//       <div className="flex items-center gap-2">
//         <Calendar className="h-4 w-4 text-muted-foreground" />
//         <span className="text-sm text-muted-foreground">
//           {new Date(row.original.lastUpdated).toLocaleDateString()}
//         </span>
//       </div>
//     ),
//   },
//   {
//     accessorKey: "priority",
//     header: "Priority",
//     cell: ({ row }) => {
//       const priorityColors = {
//         High: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
//         Medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
//         Low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
//       }
      
//       return (
//         <Badge className={`${priorityColors[row.original.priority as keyof typeof priorityColors] || priorityColors.Medium}`}>
//           {row.original.priority}
//         </Badge>
//       )
//     },
//   },
// ]

// function DraggableRow({ row }: { row: Row<z.infer<typeof schema>> }) {
//   const { transform, transition, setNodeRef, isDragging } = useSortable({
//     id: row.original.id,
//   })

//   return (
//     <TableRow
//       data-state={row.getIsSelected() && "selected"}
//       data-dragging={isDragging}
//       ref={setNodeRef}
//       className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
//       style={{
//         transform: CSS.Transform.toString(transform),
//         transition: transition,
//       }}
//     >
//       {row.getVisibleCells().map((cell) => (
//         <TableCell key={cell.id}>
//           {flexRender(cell.column.columnDef.cell, cell.getContext())}
//         </TableCell>
//       ))}
//     </TableRow>
//   )
// }

// export function DataTable({
//   data,
// }: {
//   data: z.infer<typeof schema>[]
// }) {
//   // Real-time dashboard data
//   const { data: dashboardData, loading: dashboardLoading, error: dashboardError, fetchDashboardData } = useDashboardData()
  
//   // Generate real-time project data based on dashboard metrics
//   const realTimeData = React.useMemo(() => {
//     if (!dashboardData) return []
    
//     const projects = [
//       {
//         id: "dataset-1",
//         name: "Cryo-EM Data Analysis",
//         type: "Data Processing",
//         status: dashboardData.metrics.totalDatasets > 0 ? "In Progress" : "Not Started",
//         assignedTo: "Eddie Lake",
//         progress: Math.min(85, Math.floor(dashboardData.metrics.completionRate)),
//         lastUpdated: new Date().toISOString(),
//         priority: "High",
//         description: "Processing cryo-EM datasets for structural analysis"
//       },
//       {
//         id: "dataset-2", 
//         name: "3D Model Generation",
//         type: "Modeling",
//         status: dashboardData.metrics.totalUploads > 0 ? "In Progress" : "Not Started",
//         assignedTo: "Jamik Tashpulatov",
//         progress: Math.min(60, Math.floor(dashboardData.metrics.completionRate * 0.7)),
//         lastUpdated: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
//         priority: "Medium",
//         description: "Generating 3D models from processed datasets"
//       },
//       {
//         id: "dataset-3",
//         name: "User Access Management",
//         type: "Administration",
//         status: "Completed",
//         assignedTo: "Emily Whalen",
//         progress: 100,
//         lastUpdated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
//         priority: "Low",
//         description: "Setting up user permissions and access controls"
//       },
//       {
//         id: "dataset-4",
//         name: "Annotation System",
//         type: "Development",
//         status: dashboardData.metrics.totalUsers > 1 ? "In Progress" : "Not Started",
//         assignedTo: "Eddie Lake",
//         progress: Math.min(40, Math.floor(dashboardData.metrics.completionRate * 0.5)),
//         lastUpdated: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
//         priority: "High",
//         description: "Building annotation tools for 3D model analysis"
//       },
//       {
//         id: "dataset-5",
//         name: "Performance Optimization",
//         type: "Infrastructure",
//         status: "In Progress",
//         assignedTo: "Jamik Tashpulatov",
//         progress: Math.min(75, Math.floor(dashboardData.metrics.completionRate * 0.8)),
//         lastUpdated: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
//         priority: "Medium",
//         description: "Optimizing system performance and response times"
//       }
//     ]
    
//     // Add dynamic projects based on actual data
//     if (dashboardData.metrics.totalDatasets > 5) {
//       projects.push({
//         id: "dataset-6",
//         name: "Advanced Analytics Pipeline",
//         type: "Research",
//         status: "In Progress",
//         assignedTo: "Unassigned",
//         progress: Math.min(30, Math.floor(dashboardData.metrics.completionRate * 0.3)),
//         lastUpdated: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
//         priority: "Medium",
//         description: "Developing advanced analytics for large datasets"
//       })
//     }
    
//     if (dashboardData.metrics.totalUsers > 3) {
//       projects.push({
//         id: "dataset-7",
//         name: "Collaboration Features",
//         type: "Development",
//         status: "Not Started",
//         assignedTo: "Unassigned",
//         progress: 0,
//         lastUpdated: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
//         priority: "Low",
//         description: "Adding team collaboration and sharing features"
//       })
//     }
    
//     return projects
//   }, [dashboardData])

//   const [data, setData] = React.useState<z.infer<typeof schema>[]>([])
//   const [rowSelection, setRowSelection] = useState({})
//   const [columnVisibility, setColumnVisibility] =
//     React.useState<VisibilityState>({})
//   const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
//     []
//   )
//   const [sorting, setSorting] = React.useState<SortingState>([])
//   const [pagination, setPagination] = React.useState({
//     pageIndex: 0,
//     pageSize: 10,
//   })
  
//   const sortableId = React.useId()
//   const sensors = useSensors(
//     useSensor(MouseSensor, {}),
//     useSensor(TouchSensor, {}),
//     useSensor(KeyboardSensor, {})
//   )

//   // Update data when dashboard data changes
//   React.useEffect(() => {
//     if (realTimeData.length > 0) {
//       setData(realTimeData)
//     }
//   }, [realTimeData])

//   const dataIds = React.useMemo<UniqueIdentifier[]>(
//     () => data?.map(({ id }) => id) || [],
//     [data]
//   )

//   const table = useReactTable({
//     data,
//     columns,
//     state: {
//       sorting,
//       columnVisibility,
//       rowSelection,
//       columnFilters,
//       pagination,
//     },
//     getRowId: (row) => row.id.toString(),
//     enableRowSelection: true,
//     onRowSelectionChange: setRowSelection,
//     onSortingChange: setSorting,
//     onColumnFiltersChange: setColumnFilters,
//     onColumnVisibilityChange: setColumnVisibility,
//     onPaginationChange: setPagination,
//     getCoreRowModel: getCoreRowModel(),
//     getFilteredRowModel: getFilteredRowModel(),
//     getPaginationRowModel: getPaginationRowModel(),
//     getSortedRowModel: getSortedRowModel(),
//     getFacetedRowModel: getFacetedRowModel(),
//     getFacetedUniqueValues: getFacetedUniqueValues(),
//   })

//   function handleDragEnd(event: DragEndEvent) {
//     const { active, over } = event
//     if (active && over && active.id !== over.id) {
//       setData((data) => {
//         const oldIndex = dataIds.indexOf(active.id)
//         const newIndex = dataIds.indexOf(over.id)
//         return arrayMove(data, oldIndex, newIndex)
//       })
//     }
//   }

//   // Real-time metrics summary
//   const metricsSummary = React.useMemo(() => {
//     if (!dashboardData) return null
    
//     return {
//       totalUsers: dashboardData.metrics.totalUsers,
//       totalDatasets: dashboardData.metrics.totalDatasets,
//       totalUploads: dashboardData.metrics.totalUploads,
//       completionRate: dashboardData.metrics.completionRate,
//       activeUsers: dashboardData.metrics.activeUsers
//     }
//   }, [dashboardData])

//   return (
//     <Tabs
//       defaultValue="projects"
//       className="w-full flex-col justify-start gap-6"
//     >
//       <div className="flex items-center justify-between px-4 lg:px-6">
//         <div className="flex items-center gap-4">
//           <Label htmlFor="view-selector" className="sr-only">
//             View
//           </Label>
//           <Select defaultValue="projects">
//             <SelectTrigger
//               className="flex w-fit @4xl/main:hidden"
//               size="sm"
//               id="view-selector"
//             >
//               <SelectValue placeholder="Select a view" />
//             </SelectTrigger>
//             <SelectContent>
//               <SelectItem value="projects">Active Projects</SelectItem>
//               <SelectItem value="datasets">Dataset Management</SelectItem>
//               <SelectItem value="users">User Management</SelectItem>
//               <SelectItem value="analytics">Analytics</SelectItem>
//             </SelectContent>
//           </Select>
          
//           {/* Real-time metrics display */}
//           {metricsSummary && (
//             <div className="hidden lg:flex items-center gap-4 text-sm">
//               <div className="flex items-center gap-2">
//                 <Users className="h-4 w-4 text-muted-foreground" />
//                 <span className="font-medium">{metricsSummary.totalUsers}</span>
//                 <span className="text-muted-foreground">Users</span>
//               </div>
//               <div className="flex items-center gap-2">
//                 <Database className="h-4 w-4 text-muted-foreground" />
//                 <span className="font-medium">{metricsSummary.totalDatasets}</span>
//                 <span className="text-muted-foreground">Datasets</span>
//               </div>
//               <div className="flex items-center gap-2">
//                 <Upload className="h-4 w-4 text-muted-foreground" />
//                 <span className="font-medium">{metricsSummary.totalUploads}</span>
//                 <span className="text-muted-foreground">Uploads</span>
//               </div>
//               <div className="flex items-center gap-2">
//                 <Activity className="h-4 w-4 text-muted-foreground" />
//                 <span className="font-medium">{metricsSummary.completionRate}%</span>
//                 <span className="text-muted-foreground">Complete</span>
//               </div>
//             </div>
//           )}
//         </div>
        
//         <TabsList className="**:data-[slot=badge]:bg-muted-foreground/30 hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:px-1 @4xl/main:flex">
//           <TabsTrigger value="projects">Active Projects</TabsTrigger>
//           <TabsTrigger value="datasets">
//             Dataset Management <Badge variant="secondary">{metricsSummary?.totalDatasets || 0}</Badge>
//           </TabsTrigger>
//           <TabsTrigger value="users">
//             User Management <Badge variant="secondary">{metricsSummary?.totalUsers || 0}</Badge>
//           </TabsTrigger>
//           <TabsTrigger value="analytics">Analytics</TabsTrigger>
//         </TabsList>
        
//         <div className="flex items-center gap-2">
//           <Button
//             variant="outline"
//             size="sm"
//             onClick={fetchDashboardData}
//             disabled={dashboardLoading}
//             className="gap-2"
//           >
//             <RefreshCw className={`h-4 w-4 ${dashboardLoading ? 'animate-spin' : ''}`} />
//             Refresh
//           </Button>
          
//           <DropdownMenu>
//             <DropdownMenuTrigger asChild>
//               <Button variant="outline" size="sm">
//                 <Columns />
//                 <span className="hidden lg:inline">Customize Columns</span>
//                 <span className="lg:hidden">Columns</span>
//                 <IconChevronDown />
//               </Button>
//             </DropdownMenuTrigger>
//             <DropdownMenuContent align="end" className="w-56">
//               {table
//                 .getAllColumns()
//                 .filter(
//                   (column) =>
//                     typeof column.accessorFn !== "undefined" &&
//                     column.getCanHide()
//                 )
//                 .map((column) => {
//                   return (
//                     <DropdownMenuCheckboxItem
//                       key={column.id}
//                       className="capitalize"
//                       checked={column.getIsVisible()}
//                       onCheckedChange={(value) =>
//                         column.toggleVisibility(!!value)
//                       }
//                     >
//                       {column.id}
//                     </DropdownMenuCheckboxItem>
//                   )
//                 })}
//             </DropdownMenuContent>
//           </DropdownMenu>
//           <Button variant="outline" size="sm">
//             <Plus />
//             <span className="hidden lg:inline">Add Project</span>
//           </Button>
//         </div>
//       </div>
      
//       <TabsContent
//         value="projects"
//         className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
//       >
//         {/* Real-time status indicator */}
//         {dashboardError && (
//           <div className="rounded-lg border border-border bg-card p-4">
//             <div className="flex items-center gap-2">
//               <Activity className="h-4 w-4" />
//               <span className="font-medium">Dashboard Error:</span>
//               <span>{dashboardError}</span>
//             </div>
//           </div>
//         )}
        
//         <div className="overflow-hidden rounded-lg border">
//           <DndContext
//             collisionDetection={closestCenter}
//             modifiers={[restrictToVerticalAxis]}
//             onDragEnd={handleDragEnd}
//             sensors={sensors}
//             id={sortableId}
//           >
//             <Table>
//               <TableHeader className="bg-muted sticky top-0 z-10">
//                 {table.getHeaderGroups().map((headerGroup) => (
//                   <TableRow key={headerGroup.id}>
//                     {headerGroup.headers.map((header) => {
//                       return (
//                         <TableHead key={header.id} colSpan={header.colSpan}>
//                           {header.isPlaceholder
//                             ? null
//                             : flexRender(
//                                 header.column.columnDef.header,
//                                 header.getContext()
//                               )}
//                         </TableHead>
//                       )
//                     })}
//                   </TableRow>
//                 ))}
//               </TableHeader>
//               <TableBody className="**:data-[slot=table-cell]:first:w-8">
//                 {table.getRowModel().rows?.length ? (
//                   <SortableContext
//                     items={dataIds}
//                     strategy={verticalListSortingStrategy}
//                   >
//                     {table.getRowModel().rows.map((row) => (
//                       <DraggableRow key={row.id} row={row} />
//                     ))}
//                   </SortableContext>
//                 ) : (
//                   <TableRow>
//                     <TableCell
//                       colSpan={columns.length}
//                       className="h-24 text-center"
//                     >
//                       {dashboardLoading ? "Loading projects..." : "No projects found."}
//                     </TableCell>
//                   </TableRow>
//                 )}
//               </TableBody>
//             </Table>
//           </DndContext>
//         </div>
//         <div className="flex items-center justify-between px-4">
//           <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
//             {table.getFilteredSelectedRowModel().rows.length} of{" "}
//             {table.getFilteredRowModel().rows.length} project(s) selected.
//           </div>
//           <div className="flex w-full items-center gap-8 lg:w-fit">
//             <div className="hidden items-center gap-2 lg:flex">
//               <Label htmlFor="rows-per-page" className="text-sm font-medium">
//                 Rows per page
//               </Label>
//               <Select
//                 value={`${table.getState().pagination.pageSize}`}
//                 onValueChange={(value) => {
//                   table.setPageSize(Number(value))
//                 }}
//               >
//                 <SelectTrigger size="sm" className="w-20" id="rows-per-page">
//                   <SelectValue
//                     placeholder={table.getState().pagination.pageSize}
//                   />
//                 </SelectTrigger>
//                 <SelectContent side="top">
//                   {[10, 20, 30, 40, 50].map((pageSize) => (
//                     <SelectItem key={pageSize} value={`${pageSize}`}>
//                       {pageSize}
//                     </SelectItem>
//                   ))}
//                 </SelectContent>
//               </Select>
//             </div>
//             <div className="flex w-fit items-center justify-center text-sm font-medium">
//               Page {table.getState().pagination.pageIndex + 1} of{" "}
//               {table.getPageCount()}
//             </div>
//             <div className="ml-auto flex items-center gap-2 lg:ml-0">
//               <Button
//                 variant="outline"
//                 className="hidden h-8 w-8 p-0 lg:flex"
//                 onClick={() => table.setPageIndex(0)}
//                 disabled={!table.getCanPreviousPage()}
//               >
//                 <span className="sr-only">Go to first page</span>
//                 <IconChevronsLeft />
//               </Button>
//               <Button
//                 variant="outline"
//                 className="size-8"
//                 size="icon"
//                 onClick={() => table.previousPage()}
//                 disabled={!table.getCanPreviousPage()}
//               >
//                 <span className="sr-only">Go to previous page</span>
//                 <IconChevronLeft />
//               </Button>
//               <Button
//                 variant="outline"
//                 className="size-8"
//                 size="icon"
//                 onClick={() => table.nextPage()}
//                 disabled={!table.getCanNextPage()}
//               >
//                 <span className="sr-only">Go to next page</span>
//                 <IconChevronRight />
//               </Button>
//               <Button
//                 variant="outline"
//                 className="hidden size-8 lg:flex"
//                 size="icon"
//                 onClick={() => table.setPageIndex(table.getPageCount() - 1)}
//                 disabled={!table.getCanNextPage()}
//               >
//                 <span className="sr-only">Go to last page</span>
//                 <IconChevronsRight />
//               </Button>
//             </div>
//           </div>
//         </div>
//       </TabsContent>
//       <TabsContent
//         value="datasets"
//         className="flex flex-col px-4 lg:px-6"
//       >
//         <div className="aspect-video w-full flex-1 rounded-lg border border-dashed flex items-center justify-center">
//           <div className="text-center">
//             <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
//             <h3 className="text-lg font-semibold mb-2">Dataset Management</h3>
//             <p className="text-muted-foreground">Manage and organize your cryo-EM datasets</p>
//           </div>
//         </div>
//       </TabsContent>
//       <TabsContent value="users" className="flex flex-col px-4 lg:px-6">
//         <div className="aspect-video w-full flex-1 rounded-lg border border-dashed flex items-center justify-center">
//           <div className="text-center">
//             <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
//             <h3 className="text-lg font-semibold mb-2">User Management</h3>
//             <p className="text-muted-foreground">Control user access and permissions</p>
//           </div>
//         </div>
//       </TabsContent>
//       <TabsContent
//         value="analytics"
//         className="flex flex-col px-4 lg:px-6"
//       >
//         <div className="aspect-video w-full flex-1 rounded-lg border border-dashed flex items-center justify-center">
//           <div className="text-center">
//             <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
//             <h3 className="text-lg font-semibold mb-2">Analytics Dashboard</h3>
//             <p className="text-muted-foreground">Advanced analytics and insights</p>
//           </div>
//         </div>
//       </TabsContent>
//     </Tabs>
//   )
// }

// const chartData = [
//   { month: "January", desktop: 186, mobile: 80 },
//   { month: "February", desktop: 305, mobile: 200 },
//   { month: "March", desktop: 237, mobile: 120 },
//   { month: "April", desktop: 73, mobile: 190 },
//   { month: "May", desktop: 209, mobile: 130 },
//   { month: "June", desktop: 214, mobile: 140 },
// ]

// const chartConfig = {
//   desktop: {
//     label: "Desktop",
//     color: "var(--primary)",
//   },
//   mobile: {
//     label: "Mobile",
//     color: "var(--primary)",
//   },
// } satisfies ChartConfig

// function TableCellViewer({ item }: { item: z.infer<typeof schema> }) {
//   const isMobile = useIsMobile()

//   return (
//     <Drawer direction={isMobile ? "bottom" : "right"}>
//       <DrawerTrigger asChild>
//         <Button variant="link" className="text-foreground w-fit px-0 text-left">
//           {item.name}
//         </Button>
//       </DrawerTrigger>
//       <DrawerContent>
//         <DrawerHeader className="gap-1">
//           <DrawerTitle>{item.name}</DrawerTitle>
//           <DrawerDescription>
//             {item.description || "Project details and management"}
//           </DrawerDescription>
//         </DrawerHeader>
//         <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
//           {!isMobile && (
//             <>
//               <div className="grid gap-2">
//                 <div className="flex gap-2 leading-none font-medium">
//                   Project Overview
//                 </div>
//                 <div className="text-muted-foreground">
//                   {item.description || "This project is part of the cryo-EM data analysis pipeline."}
//                 </div>
//               </div>
//               <Separator />
//             </>
//           )}
//           <form className="flex flex-col gap-4">
//             <div className="flex flex-col gap-3">
//               <Label htmlFor="name">Project Name</Label>
//               <Input id="name" defaultValue={item.name} />
//             </div>
//             <div className="grid grid-cols-2 gap-4">
//               <div className="flex flex-col gap-3">
//                 <Label htmlFor="type">Project Type</Label>
//                 <Select defaultValue={item.type}>
//                   <SelectTrigger id="type" className="w-full">
//                     <SelectValue placeholder="Select a type" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="Data Processing">Data Processing</SelectItem>
//                     <SelectItem value="Modeling">Modeling</SelectItem>
//                     <SelectItem value="Development">Development</SelectItem>
//                     <SelectItem value="Research">Research</SelectItem>
//                     <SelectItem value="Infrastructure">Infrastructure</SelectItem>
//                   </SelectContent>
//                 </Select>
//               </div>
//               <div className="flex flex-col gap-3">
//                 <Label htmlFor="status">Status</Label>
//                 <Select defaultValue={item.status}>
//                   <SelectTrigger id="status" className="w-full">
//                     <SelectValue placeholder="Select a status" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="Completed">Completed</SelectItem>
//                     <SelectItem value="In Progress">In Progress</SelectItem>
//                     <SelectItem value="Not Started">Not Started</SelectItem>
//                   </SelectContent>
//                 </Select>
//               </div>
//             </div>
//             <div className="grid grid-cols-2 gap-4">
//               <div className="flex flex-col gap-3">
//                 <Label htmlFor="progress">Progress (%)</Label>
//                 <Input id="progress" type="number" min="0" max="100" defaultValue={item.progress} />
//               </div>
//               <div className="flex flex-col gap-3">
//                 <Label htmlFor="priority">Priority</Label>
//                 <Select defaultValue={item.priority}>
//                   <SelectTrigger id="priority" className="w-full">
//                     <SelectValue placeholder="Select priority" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="High">High</SelectItem>
//                     <SelectItem value="Medium">Medium</SelectItem>
//                     <SelectItem value="Low">Low</SelectItem>
//                   </SelectContent>
//                 </Select>
//               </div>
//             </div>
//             <div className="flex flex-col gap-3">
//               <Label htmlFor="assignee">Assigned To</Label>
//               <Select defaultValue={item.assignedTo}>
//                 <SelectTrigger id="assignee" className="w-full">
//                   <SelectValue placeholder="Select assignee" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="Eddie Lake">Eddie Lake</SelectItem>
//                   <SelectItem value="Jamik Tashpulatov">Jamik Tashpulatov</SelectItem>
//                   <SelectItem value="Emily Whalen">Emily Whalen</SelectItem>
//                   <SelectItem value="Unassigned">Unassigned</SelectItem>
//                 </SelectContent>
//               </Select>
//             </div>
//           </form>
//         </div>
//         <DrawerFooter>
//           <Button>Update Project</Button>
//           <DrawerClose asChild>
//             <Button variant="outline">Done</Button>
//           </DrawerClose>
//         </DrawerFooter>
//       </DrawerContent>
//     </Drawer>
//   )
// }
