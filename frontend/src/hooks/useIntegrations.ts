import { useQuery } from "@tanstack/react-query";
import { apiCredentialsService } from "@/services/apiCredentialsService";
import { integrationEventsService, IntegrationEvent } from "@/services/integrationEventsService";

export interface IntegrationItem {
  id: number | string;
  name: string;
  slug?: string;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
  config?: Record<string, any>;
}

function normalizeListResponse(resp: any): IntegrationItem[] {
  const arr = (resp?.data?.data || resp?.data || []) as any[];
  const items = Array.isArray(arr) ? arr : [];
  return items.map((i: any) => ({
    id: i.id ?? String(Math.random()),
    name: String(i.name ?? i.slug ?? "Integração"),
    slug: i.slug ? String(i.slug) : undefined,
    active: typeof i.active === "boolean" ? i.active : Boolean(i.active),
    created_at: i.created_at,
    updated_at: i.updated_at,
    config: i.config,
  }));
}

function sortByRecent(items: IntegrationItem[]): IntegrationItem[] {
  return [...items].sort((a, b) => {
    const ad = new Date(String(a.updated_at || a.created_at || 0)).getTime();
    const bd = new Date(String(b.updated_at || b.created_at || 0)).getTime();
    return bd - ad;
  });
}

export function useRecentIntegrations(limit: number = 8, queryOptions?: any) {
  return useQuery({
    queryKey: ["integrations", "recent", limit],
    queryFn: async () => {
      const resp = await apiCredentialsService.list({ per_page: 50 });
      const normalized = normalizeListResponse(resp);
      const sorted = sortByRecent(normalized);
      return sorted.slice(0, limit);
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000,
    ...queryOptions,
  });
}

export function useRecentIntegrationEvents(limit: number = 8, filters?: { supplier?: string; from?: string; to?: string; status?: string }, queryOptions?: any) {
  return useQuery({
    queryKey: ["integrations", "events", "recent", limit, filters],
    queryFn: async () => {
      const resp = await integrationEventsService.listRecent(limit, filters);
      return resp?.data || [];
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000,
    ...queryOptions,
  });
}
