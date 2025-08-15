"use client";

import { Suspense, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import VolumeViewer from "@/components/VolumeViewerPng";
import OrthographicViewer from "@/components/OrthographicViewer/OrthographicViewer";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";

export default function ClientHome() {
  const [activeTab, setActiveTab] = useState<"orthographic" | "volume">(
    "orthographic"
  );
  const searchParams = useSearchParams();
  const datasetId = searchParams.get("datasetId");

  const { data: dataset, isLoading, error } = useQuery({
    queryKey: ["dataset", datasetId],
    queryFn: async () => {
      if (!datasetId) {
        console.log("No datasetId in query params, skipping fetch");
        return null;
      }
      const response = await fetch(`/api/admin?datasetId=${datasetId}`);
      if (!response.ok) {
        console.error("Failed to fetch dataset:", response.statusText);
        throw new Error("Failed to fetch dataset");
      }
      const result = await response.json();
      if (result.error) {
        console.error("API returned error:", result.error);
        return null; // Handle "Dataset not found"
      }
      console.log("Fetched dataset:", result.dataset);
      return result.dataset || null; // Return the dataset or null if not found
    },
    enabled: !!datasetId,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <p>Loading dataset...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <p>Error loading dataset: {error.message}</p>
      </div>
    );
  }
  if (!dataset || !dataset._id || !dataset.brightfieldBlobUrl) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <p>Dataset not found or invalid dataset ID provided</p>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">CryoViz</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>
                    {activeTab === "volume"
                      ? "Volume Viewer"
                      : "Orthographic Viewer"}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        {/* Toggle Tabs */}
        <motion.div
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-30"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <div className="flex p-0.5 rounded-full border backdrop-blur-md bg-white/80 dark:bg-black/80 border-gray-300 dark:border-gray-800">
            {["orthographic", "volume"].map((tab) => (
              <Button
                key={tab}
                variant="ghost"
                size="sm"
                className={cn(
                  "rounded-full px-4 py-1 text-xs tracking-wider transition-colors",
                  activeTab === tab
                    ? "bg-gray-200 text-black dark:bg-gray-800 dark:text-white"
                    : "text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white"
                )}
                onClick={() => setActiveTab(tab as "orthographic" | "volume")}
              >
                {tab.toUpperCase()}
              </Button>
            ))}
          </div>
        </motion.div>

        {/* Viewer */}
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min">
            <div className="p-4">
              {activeTab === "orthographic" ? (
                <Suspense fallback={<div>Loading Orthographic Viewer...</div>}>
                  <OrthographicViewer
                    brightfieldBlobUrl={dataset.brightfieldBlobUrl}
                    datasetId={dataset._id.toString()}
                    brightfieldNumZ={dataset.brightfieldNumZ}
                    brightfieldNumY={dataset.brightfieldNumY}
                    brightfieldNumX={dataset.brightfieldNumX}
                    fluorescentNumZ={dataset.fluorescentNumZ}
                    fluorescentNumY={dataset.fluorescentNumY}
                    fluorescentNumX={dataset.fluorescentNumX}
                  />
                </Suspense>
              ) : (
                <Suspense fallback={<div>Loading Volume Viewer...</div>}>
                  <VolumeViewer
                    brightfieldBlobUrl={dataset.brightfieldBlobUrl}
                    // datasetId={dataset._id.toString()}
                    brightfieldNumZ={dataset.brightfieldNumZ}
                    // brightfieldNumY={dataset.brightfieldNumY}
                    // brightfieldNumX={dataset.brightfieldNumX}
                    fluorescentNumZ={dataset.fluorescentNumZ}
                    // fluorescentNumY={dataset.fluorescentNumY}
                    // fluorescentNumX={dataset.fluorescentNumX}
                  />
                </Suspense>
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}