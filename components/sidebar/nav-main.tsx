"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { LucideIcon } from "lucide-react";

// Shape: top-level list (e.g., "Datasets" section)
export type NavItem = {
  title: string;
  url?: string;              // can be "#" to indicate disabled
  icon?: LucideIcon;
  isActive?: boolean;
  items?: NavItem[];         // nested (children)
};

export function NavMain({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  const renderItem = (item: NavItem, depth = 0) => {
    const Icon = item.icon as LucideIcon | undefined;
    const active =
      (item.url && pathname === item.url) ||
      item.isActive ||
      (item.items?.some((c) => c.url && pathname === c.url) ?? false);

    const buttonContent = (
      <SidebarMenuButton
        tooltip={item.title}
        className={depth > 0 ? "pl-8" : undefined} // indent children
        asChild={!!item.url && item.url !== "#"}
      >
        {item.url && item.url !== "#" ? (
          <Link href={item.url}>
            {Icon ? <Icon className="mr-2 h-4 w-4" /> : null}
            <span className="truncate">{item.title}</span>
          </Link>
        ) : (
          <div className="flex items-center opacity-60">
            {Icon ? <Icon className="mr-2 h-4 w-4" /> : null}
            <span className="truncate">{item.title}</span>
          </div>
        )}
      </SidebarMenuButton>
    );

    return (
      <React.Fragment key={`${item.title}-${item.url}-${depth}`}>
        <SidebarMenuItem data-active={active ? "true" : undefined}>
          {buttonContent}
        </SidebarMenuItem>
        {/* children */}
        {item.items && item.items.length > 0
          ? item.items.map((child) => renderItem(child, depth + 1))
          : null}
      </React.Fragment>
    );
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => renderItem(item))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}