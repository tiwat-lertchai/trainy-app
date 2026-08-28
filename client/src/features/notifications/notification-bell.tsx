import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { countUnread } from "./notification-rules";

export function NotificationBell() {
	const [open, setOpen] = useState(false);
	const queryClient = useQueryClient();
	const notifications = useQuery({ queryKey: ["notifications"], queryFn: async () => { const response = await apiClient.api.v1.notifications.$get(); if (!response.ok) throw new Error("NOTIFICATIONS_FAILED"); return response.json(); } });
	const markRead = useMutation({ mutationFn: async (notificationId: string) => { const response = await apiClient.api.v1.notifications[":notificationId"].read.$post({ param: { notificationId } }); if (!response.ok) throw new Error("NOTIFICATION_READ_FAILED"); return response.json(); }, onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["notifications"] }) });
	const unread = countUnread(notifications.data?.data ?? []);
	return <div className="relative"><Button variant="ghost" size="icon" aria-label="Notifications" aria-expanded={open} onClick={() => setOpen((value) => !value)}><Bell />{unread > 0 && <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-destructive text-[10px] font-bold text-white">{Math.min(unread, 9)}</span>}</Button>{open && <div className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border bg-white shadow-xl"><div className="border-b p-4"><h2 className="font-bold">การแจ้งเตือน</h2><p className="mt-1 text-xs text-muted-foreground">ยังไม่ได้อ่าน {unread} รายการ</p></div><div className="max-h-96 overflow-y-auto">{notifications.isLoading && <p className="p-5 text-sm text-muted-foreground">กำลังโหลด...</p>}{notifications.isError && <p role="alert" className="p-5 text-sm text-destructive">โหลดการแจ้งเตือนไม่สำเร็จ</p>}{notifications.data?.data.length === 0 && <p className="p-5 text-sm text-muted-foreground">ยังไม่มีการแจ้งเตือน</p>}{notifications.data?.data.map((item) => <div key={item.id} className={`border-b p-4 last:border-0 ${item.readAt ? "bg-white" : "bg-[#f5f8ff]"}`}><div className="flex items-start gap-3"><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{item.message}</p><p className="mt-2 text-xs text-muted-foreground">{new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}</p></div>{!item.readAt && <Button size="icon" variant="ghost" aria-label="Mark notification as read" disabled={markRead.isPending} onClick={() => markRead.mutate(item.id)}><Check /></Button>}</div></div>)}</div></div>}</div>;
}
