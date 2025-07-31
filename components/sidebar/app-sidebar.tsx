"use client";

import * as React from "react";
import {
  BookOpen,
  Bot,
  Command,
  Frame,
  LifeBuoy,
  Map,
  PieChart,
  Send,
  Settings2,
  SquareTerminal,
  Home, 
  LayoutDashboard,
} from "lucide-react";
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
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { User } from "@/lib/models";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session, status } = useSession();
  const [userAccessLevel, setUserAccessLevel] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();

  React.useEffect(() => {
    const fetchUserAccessLevel = async () => {
      if (status === "loading") return;
      if (status === "unauthenticated" || !session?.user?.email) {
        router.push("/auth/login");
        return;
      }

      try {
        const response = await fetch("/api/admin");
        if (!response.ok) {
          throw new Error("Failed to fetch user data");
        }
        const data = await response.json();
        const currentUser = data.users.find((u: User) => u.email === session?.user?.email);

        if (!currentUser) {
          throw new Error("User not found");
        }

        setUserAccessLevel(currentUser.accessLevel);
      } catch (error) {
        console.error("Error fetching user access level:", error);
        router.push("/auth/login");
      } finally {
        setLoading(false);
      }
    };

    fetchUserAccessLevel();
  }, [status, session, router]);

  const navMain = [
    ...(userAccessLevel === "admin"
      ? [
          {
            title: "Dashboard",
            url: "/admin",
            icon: LayoutDashboard,
            isActive: true,
            items: [
              {
                title: "Institutions",
                url: "/admin/institutions",
              },
              {
                title: "Users",
                url: "/admin/users",
              },
              {
                title: "Datasets",
                url: "/admin/dataset",
              },
            ],
          },
        ]
      : []),
    {
      title: "Datasets",
      url: "/users_datasets",
      icon: Bot,
      items: [],
    },
  ];
  const data = {
    navSecondary: [
      {
        title: "Support",
        url: "#",
        icon: LifeBuoy,
      },
      {
        title: "Feedback",
        url: "#",
        icon: Send,
      },
    ],
    projects: [
      {
        name: "CryoViz 1",
        url: "#",
        icon: Frame,
      },
    ],
  };

  const user = {
    name: session?.user?.name || "User",
    email: session?.user?.email || "",
    avatar: "/placeholder-user.jpg", // Replace with session?.user?.image if available
  };

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
          <div className="p-4">Loading...</div>
        </SidebarContent>
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