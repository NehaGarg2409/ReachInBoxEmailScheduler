import useSWR from "swr";
import { api } from "../lib/api";

export function useScheduledEmails(page = 1) {
  const { data, error, isLoading, mutate } = useSWR(
    ["scheduled", page],
    () => api.scheduled(page),
    { refreshInterval: 5000 } // poll — scheduled emails move to "sent" as the worker runs
  );

  return {
    emails: data?.items ?? [],
    total: data?.total ?? 0,
    isLoading,
    error,
    refresh: mutate,
  };
}
