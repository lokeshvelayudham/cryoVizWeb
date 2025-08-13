"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Dataset, Institution, User, DatasetMapping } from "@/lib/models";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRight, Lock } from "lucide-react";

type AdminDataResult = {
  institutions: Institution[];
  users: User[];
  datasets: Dataset[];
  currentUser: User;
};

type MappingView = {
  mappingId: string;
  parent: Dataset | null;
  children: { dataset: Dataset | null; alias?: string }[];
};

export default function UsersDatasets() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Redirect unauthenticated users (effect is fine; it's not a hook count issue)
  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  // Queries: always *declare* them. Use `enabled` to avoid network calls, but don't conditionally skip hook calls.
  const {
    data: baseData,
    isLoading: isLoadingBase,
    error: baseError,
  } = useQuery<AdminDataResult>({
    queryKey: ["adminData", session?.user?.email],
    enabled: status === "authenticated",
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<AdminDataResult> => {
      if (status !== "authenticated" || !session?.user?.email) {
        // throw to surface a "not logged in" state if somehow queried
        throw new Error("Please log in to access datasets.");
      }
      const response = await fetch("/api/admin");
      if (!response.ok) throw new Error("Failed to fetch admin data");
      const result = await response.json();

      const currentUser: User | undefined = result.users.find(
        (u: User) => u.email === session.user!.email
      );
      if (!currentUser) throw new Error("User not found");

      // Filter datasets for non-admin
      let filteredDatasets: Dataset[] = result.datasets || [];
      if (currentUser.accessLevel !== "admin") {
        const assigned = new Set(currentUser.assignedDatasets || []);
        filteredDatasets = (result.datasets || []).filter((d: Dataset) =>
          assigned.has(d._id?.toString() || "")
        );
      }

      return {
        institutions: result.institutions || [],
        users: result.users || [],
        datasets: filteredDatasets,
        currentUser,
      };
    },
  });

  const {
    data: mappingData,
    isLoading: isLoadingMappings,
    error: mappingsError,
  } = useQuery<{ mappings: DatasetMapping[] }>({
    queryKey: ["datasetMappings"],
    enabled: status === "authenticated",
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await fetch("/api/dataset-mappings");
      if (!res.ok) throw new Error("Failed to fetch dataset mappings");
      return res.json();
    },
  });

  // ------- Derivations & UI state (all hooks declared unconditionally) --------

  const institutions = baseData?.institutions ?? [];
  const datasets = baseData?.datasets ?? [];
  const currentUser = baseData?.currentUser ?? ({} as User);
  const allMappings = mappingData?.mappings ?? [];

  const [search, setSearch] = React.useState("");
  const [instFilter, setInstFilter] = React.useState<string>("all");
  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(9);

  React.useEffect(() => {
    setPageIndex(0);
  }, [search, instFilter, pageSize]);

  const datasetById = React.useMemo(() => {
    const m = new Map<string, Dataset>();
    for (const d of datasets) {
      if (d._id) m.set(d._id.toString(), d);
    }
    return m;
  }, [datasets]);

  const institutionById = React.useMemo(() => {
    const m = new Map<string, Institution>();
    for (const inst of institutions) {
      if (inst._id) m.set(inst._id.toString(), inst);
    }
    return m;
  }, [institutions]);

  const mappedParentIds = React.useMemo(
    () => new Set(allMappings.map((m) => m.parentId)),
    [allMappings]
  );

  const mappedChildIds = React.useMemo(() => {
    const s = new Set<string>();
    for (const m of allMappings) for (const c of m.children || []) s.add(c.datasetId);
    return s;
  }, [allMappings]);

  const assignedSet = React.useMemo(
    () => new Set(currentUser?.assignedDatasets || []),
    [currentUser?.assignedDatasets]
  );

  const visibleMappings = React.useMemo(() => {
    if (!currentUser?.accessLevel) return [];
    if (currentUser.accessLevel === "admin") return allMappings;

    return allMappings.filter((m) => {
      const parentOk = assignedSet.has(m.parentId);
      const childOk = (m.children || []).some((c) => assignedSet.has(c.datasetId));
      return parentOk || childOk;
    });
  }, [allMappings, currentUser?.accessLevel, assignedSet]);

  const mappingViews: MappingView[] = React.useMemo(() => {
    return visibleMappings.map((m) => ({
      mappingId: m._id?.toString() || "",
      parent: datasetById.get(m.parentId) || null,
      children: (m.children || []).map((c) => ({
        dataset: datasetById.get(c.datasetId) || null,
        alias: c.alias,
      })),
    }));
  }, [visibleMappings, datasetById]);

  const standaloneDatasets = React.useMemo(() => {
    return datasets.filter((d) => {
      const id = d._id?.toString() || "";
      return !mappedParentIds.has(id) && !mappedChildIds.has(id);
    });
  }, [datasets, mappedParentIds, mappedChildIds]);

  const filteredMappingViews = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return mappingViews.filter((mv) => {
      const parentName = mv.parent?.name?.toLowerCase() || "";
      const parentInstName =
        institutionById.get(mv.parent?.institutionId?.toString() || "")?.name?.toLowerCase() || "";
      const childMatch = mv.children.some((c) => {
        const dn = c.dataset?.name?.toLowerCase() || "";
        const al = c.alias?.toLowerCase() || "";
        return dn.includes(term) || al.includes(term);
      });

      const searchOk = !term || parentName.includes(term) || childMatch || parentInstName.includes(term);
      const instOk =
        instFilter === "all" ||
        (mv.parent &&
          institutionById.get(mv.parent.institutionId?.toString() || "")?.name === instFilter);

      return searchOk && instOk;
    });
  }, [mappingViews, search, instFilter, institutionById]);

  const filteredStandalone = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return standaloneDatasets.filter((d) => {
      const instName = institutionById.get(d.institutionId?.toString() || "")?.name || "";
      const searchOk =
        !term ||
        d.name?.toLowerCase().includes(term) ||
        d.description?.toLowerCase().includes(term) ||
        instName.toLowerCase().includes(term);

      const instOk = instFilter === "all" || instName === instFilter;
      return searchOk && instOk;
    });
  }, [standaloneDatasets, search, instFilter, institutionById]);

  type CardItem =
    | { kind: "mapping"; view: MappingView }
    | { kind: "standalone"; dataset: Dataset };

  const combined: CardItem[] = React.useMemo(() => {
    const a = filteredMappingViews.map((view) => ({ kind: "mapping", view } as CardItem));
    const b = filteredStandalone.map((dataset) => ({ kind: "standalone", dataset } as CardItem));
    return [...a, ...b];
  }, [filteredMappingViews, filteredStandalone]);

  const pageCount = Math.max(1, Math.ceil(combined.length / pageSize));
  const start = pageIndex * pageSize;
  const pageItems = combined.slice(start, start + pageSize);

  const openable = React.useCallback(
    (datasetId?: string | null) => {
      if (!datasetId) return false;
      if (currentUser?.accessLevel === "admin") return true;
      return assignedSet.has(datasetId);
    },
    [currentUser?.accessLevel, assignedSet]
  );

  const getInstitutionName = React.useCallback(
    (instId?: string) => {
      if (!instId) return "N/A";
      return institutionById.get(instId)?.name || "N/A";
    },
    [institutionById]
  );

  const loading = status === "loading" || isLoadingBase || isLoadingMappings;
  const errorMsg = (baseError || mappingsError)?.message;

  // ---------------------------- RENDER ----------------------------

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Datasets</h1>

      {/* Loading & error banners (do not early-return to keep hooks order stable) */}
      {loading && (
        <div className="mb-4 text-sm text-muted-foreground">Loading datasets...</div>
      )}
      {!loading && errorMsg && (
        <div className="mb-4 text-sm text-red-500">Error loading data: {errorMsg}</div>
      )}
      {status === "unauthenticated" && (
        <div className="mb-4 text-sm text-muted-foreground">Redirecting to login…</div>
      )}

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <Input
          placeholder="Search by name, child alias, or institution..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xl"
        />
        <div className="flex gap-2">
          <Select onValueChange={setInstFilter} value={instFilter}>
            <SelectTrigger className="w-[230px]">
              <SelectValue placeholder="Filter by Institution" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Institutions</SelectItem>
              {institutions.map((inst) => (
                <SelectItem key={inst._id?.toString() || ""} value={inst.name}>
                  {inst.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Page size" />
            </SelectTrigger>
            <SelectContent>
              {[6, 9, 12, 18, 24].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  Show {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {!loading &&
          !errorMsg &&
          pageItems.map((item, idx) => {
            if (item.kind === "mapping") {
              const mv = item.view;
              const parent = mv.parent;
              const parentId = parent?._id?.toString() || "";
              const instName = parent
                ? getInstitutionName(parent.institutionId?.toString() || "")
                : "N/A";

              return (
                <Card key={`map_${mv.mappingId}_${idx}`} className="flex flex-col">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {parent?.name || "Parent not found"}
                        </CardTitle>
                        <div className="mt-1 text-sm text-muted-foreground">
                          Institution: {instName}
                        </div>
                      </div>
                      <Badge variant="secondary">Mapping</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 pt-0">
                    {parent?.description && (
                      <>
                        <p className="text-sm mb-2 line-clamp-2">{parent.description}</p>
                        <Separator className="my-2" />
                      </>
                    )}

                    <div className="mb-2 font-medium">Children</div>
                    {mv.children.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No children.</div>
                    ) : (
                      <ScrollArea className="max-h-44">
                        <div className="space-y-2 pr-2">
                          {mv.children.map((c, i) => {
                            const cid = c.dataset?._id?.toString() || "";
                            const canOpen = openable(cid);
                            const label = c.alias || c.dataset?.name || "(missing)";
                            return (
                              <div
                                key={`${mv.mappingId}_child_${cid}_${i}`}
                                className="flex items-center justify-between border rounded-md px-3 py-2"
                              >
                                <div className="truncate text-sm">{label}</div>
                                {canOpen ? (
                                  <Link href={`/home?datasetId=${cid}`}>
                                    <Button variant="outline" size="sm" className="ml-2">
                                      Open <ArrowRight className="ml-1 h-4 w-4" />
                                    </Button>
                                  </Link>
                                ) : (
                                  <Button variant="outline" size="sm" disabled className="ml-2">
                                    <Lock className="h-4 w-4 mr-1" /> No access
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    )}

                    <Separator className="my-3" />

                    <div className="flex gap-2">
                      {openable(parentId) ? (
                        <Link href={`/home?datasetId=${parentId}`} className="w-full">
                          <Button className="w-full">Open Parent</Button>
                        </Link>
                      ) : (
                        <Button className="w-full" disabled>
                          <Lock className="h-4 w-4 mr-1" /> No access to parent
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            }

            // Standalone dataset card
            const d = item.dataset;
            const instName = getInstitutionName(d.institutionId?.toString() || "");
            return (
              <Card key={`ds_${d._id?.toString() || idx}`} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{d.name}</CardTitle>
                      <div className="mt-1 text-sm text-muted-foreground">
                        Institution: {instName}
                      </div>
                    </div>
                    <Badge>Standalone</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 pt-0">
                  <p className="text-sm mb-3 line-clamp-3">
                    {d.description || "No description"}
                  </p>
                  <Link href={`/home?datasetId=${d._id?.toString() || ""}`} className="w-full">
                    <Button className="w-full">View Details</Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}

        {!loading && !errorMsg && pageItems.length === 0 && (
          <div className="col-span-full text-sm text-muted-foreground">
            No datasets found.
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end gap-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
          disabled={pageIndex === 0}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPageIndex((i) => Math.min(pageCount - 1, i + 1))}
          disabled={pageIndex >= pageCount - 1}
        >
          Next
        </Button>
        <span className="text-sm">
          Page {Math.min(pageIndex + 1, pageCount)} of {pageCount}
        </span>
      </div>
    </div>
  );
}