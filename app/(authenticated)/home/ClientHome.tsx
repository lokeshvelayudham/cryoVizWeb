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

export default function ClientHome() {
  const [activeTab, setActiveTab] = useState<"orthographic" | "volume">(
    "orthographic"
  );


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
                <Suspense fallback={<div>Loading...</div>}>
                  <OrthographicViewer />
                </Suspense>
              ) : (
                <VolumeViewer />
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
