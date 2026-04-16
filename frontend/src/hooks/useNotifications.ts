import { useQuery } from "@tanstack/react-query";

import { getDashboard } from "@/lib/firestore";

export interface Notification {
  id: string;
  type: "fault" | "stock";
  title: string;
  detail: string;
}

export function useNotifications() {
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
    staleTime: 30_000,
  });

  const notifications = (data?.notifications ?? []) as Notification[];
  return { notifications, count: notifications.length };
}
