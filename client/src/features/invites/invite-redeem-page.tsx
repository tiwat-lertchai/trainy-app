import { useMutation } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { BadgeCheck, TicketCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/config";
import { apiClient } from "@/lib/api-client";
import { InviteApiError, throwInviteError } from "./invite-api";
import { inviteErrorMessage } from "./invite-rules";

export function InviteRedeemPage() {
	const { locale, t } = useLanguage();
	const { token } = useParams({ from: "/app/invites/$token" });
	const redeem = useMutation({
		mutationFn: async () => {
			const response = await apiClient.api.v1.invites[":token"].redeem.$post({ param: { token } });
			if (!response.ok) await throwInviteError(response);
			return response.json();
		},
	});
	return (
		<div className="mx-auto max-w-xl rounded-3xl border bg-white p-8 text-center shadow-sm">
			{redeem.isSuccess ? (
				<>
					<span className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
						<BadgeCheck />
					</span>
					<h1 className="mt-5 text-2xl font-black">{t("invites.redeem.successTitle")}</h1>
					<p className="mt-2 text-muted-foreground">{t("invites.redeem.successDetail")}</p>
					<Button asChild className="mt-6">
						<Link to="/app">{t("invites.redeem.home")}</Link>
					</Button>
				</>
			) : (
				<>
					<span className="mx-auto grid size-14 place-items-center rounded-2xl bg-blue-50 text-primary">
						<TicketCheck />
					</span>
					<h1 className="mt-5 text-2xl font-black">{t("invites.redeem.title")}</h1>
					<p className="mt-2 text-muted-foreground">{t("invites.redeem.detail")}</p>
					{redeem.isError && (
						<p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-destructive">
							{inviteErrorMessage((redeem.error as InviteApiError).code, locale)}
						</p>
					)}
					<Button className="mt-6" disabled={redeem.isPending} onClick={() => redeem.mutate()}>
						{redeem.isPending ? t("invites.redeem.pending") : t("invites.redeem.confirm")}
					</Button>
				</>
			)}
		</div>
	);
}
