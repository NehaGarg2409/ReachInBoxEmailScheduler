import useSWR from "swr";
import { api } from "../lib/api";

export function useSentEmails(page = 1) {
  const { data, error, isLoading, mutate } = useSWR(["sent", page], () => api.sent(page), {
    refreshInterval: 8000,
  });

  return {
    emails: data?.items ?? [],
    total: data?.total ?? 0,
    isLoading,
    error,
    refresh: mutate,
  };
}
