"use client";

import * as React from "react";
import {
  LayoutDashboard,
  Bot,
  LifeBuoy,
  Send,
  Frame,
  CornerDownRight,
  Lock,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { User, Dataset, Institution, DatasetMapping } from "@/lib/models";

import { NavMain } from "@/components/sidebar/nav-main";
import { NavProjects } from "@/components/sidebar/nav-projects";
import { NavSecondary } from "@/components/sidebar/nav-secondary";
import { NavUser } from "@/components/sidebar/nav-user";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/ui/mode-toggle";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const [userAccessLevel, setUserAccessLevel] = React.useState<string | null>("user");
  const [loadingGate, setLoadingGate] = React.useState(true);

  // --- Auth + base user fetch (access level) ---
  React.useEffect(() => {
    const run = async () => {
      if (status === "loading") return;
      if (status === "unauthenticated" || !session?.user?.email) {
        // Don't redirect here - let the server-side auth handle redirects
        // This prevents double login redirects
        setLoadingGate(false);
        return;
      }
      try {
        const res = await fetch("/api/admin");
        if (!res.ok) throw new Error("Failed to fetch user data");
        const data = await res.json();
        const currentUser = data.users.find((u: User) => u.email === session.user!.email);
        if (!currentUser) throw new Error("User not found");
        setUserAccessLevel(currentUser.accessLevel);
      } catch (e) {
        console.error("AppSidebar: Failed to fetch user data:", e);
        // Don't redirect on API failures - just log the error
        // The server-side auth will handle authentication redirects
        setUserAccessLevel(null);
      } finally {
        setLoadingGate(false);
      }
    };
    run();
  }, [status, session, router]);

  // --- Load datasets/users/institutions for names + permissions ---
  const {
    data: adminData,
    isLoading: isLoadingAdmin,
  } = useQuery({
    queryKey: ["adminData-sidebar", session?.user?.email],
    enabled: status === "authenticated",
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const response = await fetch("/api/admin");
      if (!response.ok) throw new Error("Failed to fetch admin data");
      const result = await response.json();
      const currentUser = result.users.find((u: User) => u.email === session?.user?.email);
      if (!currentUser) throw new Error("User not found");

      return {
        users: result.users as User[],
        institutions: result.institutions as Institution[],
        datasets: result.datasets as Dataset[],
        currentUser: currentUser as User,
      };
    },
  });

  // --- Load all mappings (we only need topology + aliases) ---
  const {
    data: mappingData,
    isLoading: isLoadingMappings,
  } = useQuery<{ mappings: DatasetMapping[] }>({
    queryKey: ["datasetMappings-sidebar"],
    enabled: status === "authenticated",
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await fetch("/api/dataset-mappings");
      if (!res.ok) throw new Error("Failed to fetch dataset mappings");
      return res.json();
    },
  });

  const loading = loadingGate || isLoadingAdmin || isLoadingMappings;

  // --- Derive current mapping context from URL ---
  const activeDatasetId = searchParams.get("datasetId") || "";

  const datasets = adminData?.datasets ?? [];
  const currentUser = adminData?.currentUser as User | undefined;

  const datasetById = React.useMemo(() => {
    const m = new Map<string, Dataset>();
    for (const d of datasets) if (d._id) m.set(d._id.toString(), d);
    return m;
  }, [datasets]);

  const assignedSet = React.useMemo(
    () => new Set(currentUser?.assignedDatasets || []),
    [currentUser?.assignedDatasets]
  );

  // Find mapping where active id is the parent or appears among children
  const allMappings = mappingData?.mappings ?? [];
  const activeMapping = React.useMemo(() => {
    if (!activeDatasetId) return null;

    // 1) Is it a parent?
    let found = allMappings.find((m) => m.parentId === activeDatasetId);
    if (found) return found;

    // 2) Is it a child?
    found = allMappings.find((m) =>
      (m.children || []).some((c) => c.datasetId === activeDatasetId)
    );
    return found || null;
  }, [allMappings, activeDatasetId]);

  // Parent to display (if any)
  const parentIdToShow = React.useMemo(() => {
    if (!activeMapping) return null;
    // If active is parent, show it; if active is child, show that mapping’s parent
    return activeMapping.parentId;
  }, [activeMapping]);

  // Children to display (resolve alias + dataset)
  const mappingChildren = React.useMemo(() => {
    if (!activeMapping) return [];
    return (activeMapping.children || []).map((c) => {
      const d = datasetById.get(c.datasetId) || null;
      return {
        id: c.datasetId,
        title: c.alias || d?.name || c.datasetId,
        hasAccess:
          (currentUser?.accessLevel === "admin") ||
          (c.datasetId && assignedSet.has(c.datasetId)),
      };
    });
  }, [activeMapping, datasetById, currentUser?.accessLevel, assignedSet]);

  // Computed parent item
  const parentItem = React.useMemo(() => {
    if (!parentIdToShow) return null;
    const d = datasetById.get(parentIdToShow);
    return {
      id: parentIdToShow,
      title: d?.name || "Parent",
      hasAccess:
        (currentUser?.accessLevel === "admin") ||
        assignedSet.has(parentIdToShow),
    };
  }, [parentIdToShow, datasetById, currentUser?.accessLevel, assignedSet]);

  // --- Build nav model ---
  const mappingNavItems =
  parentItem
    ? [
        {
          title: parentItem.title,
          url: parentItem.hasAccess ? `/home?datasetId=${parentItem.id}` : "#",
          items: mappingChildren.map((c) => ({
            title: c.title,
            url: c.hasAccess ? `/home?datasetId=${c.id}` : "#",
            icon: c.hasAccess ? CornerDownRight : Lock,
          })),
        },
      ]
    : [];

  const navMain = [
    ...(userAccessLevel === "admin"
      ? [
          {
            title: "Dashboard",
            url: "/admin",
            icon: LayoutDashboard,
            isActive: true,
            items: [
              { title: "Institutions", url: "/admin/institutions" },
              { title: "Users", url: "/admin/users" },
              { title: "Datasets", url: "/admin/dataset" },
              { title: "Mappings", url: "/admin/mappings" },
              { title: "Feedback", url: "/admin/feedback" },
            ],
          },
        ]
      : []),
    {
      title: "Datasets",
      url: "/users_datasets",
      icon: Bot,  
      items: mappingNavItems,
    },
  ];

  const data = {
    navSecondary: [
      { title: "Support", url: "#", icon: LifeBuoy },
      { title: "Feedback", url: "/feedback", icon: Send },
    ],
    projects: [{ name: "CryoViz 1", url: "#", icon: Frame }],
  };

  const user = {
    name: session?.user?.name || session?.user?.email || "User",
    email: session?.user?.email || "",
    avatar: session?.user?.image || "",
    accessLevel: userAccessLevel || "user",
  };

  // Session status tracking (development only)
  React.useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("AppSidebar - Session status:", status);
    }
  }, [status]);

  if (loading) {
    return (
      <Sidebar variant="inset" {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <a href="#">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg overflow-hidden">
                    <img
                      src="/images/biv-logo.png"
                      alt="CryoViz Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">BioInvision Inc</span>
                    <span className="truncate text-xs">CryoViz™ Web</span>
                  </div>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <div className="p-4 text-sm text-muted-foreground">Loading…</div>
        </SidebarContent>
      </Sidebar>
    );
  }

  // If user is authenticated but we couldn't fetch admin data, show basic sidebar
  if (status === "authenticated" && !adminData && !isLoadingAdmin) {
    return (
      <Sidebar variant="inset" {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <a href="#">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg overflow-hidden">
                    <img
                      src="/images/biv-logo.png"
                      alt="CryoViz Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">BioInvision Inc</span>
                    <span className="truncate text-xs">CryoViz™ Web</span>
                  </div>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <div className="p-4 text-sm text-muted-foreground">
            Unable to load user data. Please refresh the page.
          </div>
        </SidebarContent>
        <SidebarFooter>
          <NavUser user={user} />
          <ModeToggle />
        </SidebarFooter>
      </Sidebar>
    );
  }

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg overflow-hidden">
                  <img
                    src="/images/biv-logo.png"
                    alt="CryoViz Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">BioInvision Inc</span>
                  <span className="truncate text-xs">CryoViz™ Web</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={navMain} />
        <NavProjects projects={data.projects} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <NavUser user={user} />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}