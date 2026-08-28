import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/config";
import { apiClient } from "@/lib/api-client";
import { countUnread } from "./notification-rules";

export function NotificationBell() {
	const { locale, t } = useLanguage();
	const [open, setOpen] = useState(false);
	const queryClient = useQueryClient();
	const notifications = useQuery({
		queryKey: ["notifications"],
		queryFn: async () => {
			const response = await apiClient.api.v1.notifications.$get();
			if (!response.ok) throw new Error("NOTIFICATIONS_FAILED");
			return response.json();
		},
	});
	const markRead = useMutation({
		mutationFn: async (notificationId: string) => {
			const response = await apiClient.api.v1.notifications[":notificationId"].read.$post({
				param: { notificationId },
			});
			if (!response.ok) throw new Error("NOTIFICATION_READ_FAILED");
			return response.json();
		},
		onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
	});
	const unread = countUnread(notifications.data?.data ?? []);
	return (
		<div className="relative">
			<Button
				variant="ghost"
				size="icon"
				aria-label={t("notifications.label")}
				aria-expanded={open}
				onClick={() => setOpen((value) => !value)}
			>
				<Bell />
				{unread > 0 && (
					<span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-destructive text-[10px] font-bold text-white">
						{Math.min(unread, 9)}
					</span>
				)}
			</Button>
			{open && (
				<div className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border bg-white shadow-xl">
					<div className="border-b p-4">
						<h2 className="font-bold">{t("notifications.title")}</h2>
						<p className="mt-1 text-xs text-muted-foreground">
							{t("notifications.unread", { count: unread })}
						</p>
					</div>
					<div className="max-h-96 overflow-y-auto">
						{notifications.isLoading && (
							<p className="p-5 text-sm text-muted-foreground">{t("notifications.loading")}</p>
						)}
						{notifications.isError && (
							<p role="alert" className="p-5 text-sm text-destructive">
								{t("notifications.loadError")}
							</p>
						)}
						{notifications.data?.data.length === 0 && (
							<p className="p-5 text-sm text-muted-foreground">{t("notifications.empty")}</p>
						)}
						{notifications.data?.data.map((item) => (
							<div
								key={item.id}
								className={`border-b p-4 last:border-0 ${item.readAt ? "bg-white" : "bg-[#f5f8ff]"}`}
							>
								<div className="flex items-start gap-3">
									<div className="min-w-0 flex-1">
										<p className="text-sm font-semibold">{item.title}</p>
										<p className="mt-1 text-sm leading-6 text-muted-foreground">{item.message}</p>
										<p className="mt-2 text-xs text-muted-foreground">
											{new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
												dateStyle: "medium",
												timeStyle: "short",
											}).format(new Date(item.createdAt))}
										</p>
									</div>
									{!item.readAt && (
										<Button
											size="icon"
											variant="ghost"
											aria-label={t("notifications.markRead")}
											disabled={markRead.isPending}
											onClick={() => markRead.mutate(item.id)}
										>
											<Check />
										</Button>
									)}
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
