import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, MailPlus, QrCode, RotateCcw } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import type { OrganizationRole } from "@/features/organizations/role-navigation";
import { apiClient } from "@/lib/api-client";
import {
	InviteApiError,
	loadCompanies,
	loadOrganizationContexts,
	throwInviteError,
} from "./invite-api";
import {
	buildInviteUrl,
	canManageInvites,
	getInviteStatus,
	inviteErrorMessage,
	type InviteStatus,
} from "./invite-rules";

const WORKSPACE_KEY = "trainy-workspace-id";
const statusLabels: Record<InviteStatus, string> = {
	pending: "รอรับคำเชิญ",
	redeemed: "รับแล้ว",
	revoked: "ยกเลิกแล้ว",
	expired: "หมดอายุ",
};
const statusStyles: Record<InviteStatus, string> = {
	pending: "bg-amber-50 text-amber-800",
	redeemed: "bg-emerald-50 text-emerald-800",
	revoked: "bg-red-50 text-red-700",
	expired: "bg-slate-100 text-slate-600",
};
const roleLabels = {
	company_admin: "ผู้ดูแลสถานประกอบการ",
	supervisor: "ผู้ควบคุมการฝึกงาน",
} as const;

export function InviteManagementPage() {
	const queryClient = useQueryClient();
	const [targetMode, setTargetMode] = useState<"existing" | "new">("existing");
	const [revokeId, setRevokeId] = useState<string | null>(null);
	const [copiedId, setCopiedId] = useState<string | null>(null);
	const organizations = useQuery({
		queryKey: ["organizations"],
		queryFn: loadOrganizationContexts,
	});
	const context =
		organizations.data?.data.find(
			(item) => item.organization.id === localStorage.getItem(WORKSPACE_KEY),
		) ?? organizations.data?.data[0];
	const organizationId = context?.organization.id;
	const role = context?.membership.role as OrganizationRole | undefined;
	const allowed = context?.organization.type === "university" && canManageInvites(role);
	const companies = useQuery({
		queryKey: ["onboarding", "organizations", "companies"],
		queryFn: loadCompanies,
		enabled: allowed,
	});
	const invites = useQuery({
		queryKey: ["invites", organizationId],
		queryFn: async () => {
			const response = await apiClient.api.v1.invites.organization[":organizationId"].$get({
				param: { organizationId: organizationId! },
			});
			if (!response.ok) await throwInviteError(response);
			return response.json();
		},
		enabled: Boolean(organizationId && allowed),
	});
	const createInvite = useMutation({
		mutationFn: async (input: {
			role: "company_admin" | "supervisor";
			targetOrganizationId?: string;
			proposedOrganizationName?: string;
		}) => {
			const response = await apiClient.api.v1.invites.$post({
				json: { organizationId: organizationId!, ...input },
			});
			if (!response.ok) await throwInviteError(response);
			return response.json();
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invites", organizationId] }),
	});
	const revokeInvite = useMutation({
		mutationFn: async (inviteId: string) => {
			const response = await apiClient.api.v1.invites[":inviteId"].$delete({ param: { inviteId } });
			if (!response.ok) await throwInviteError(response);
			return response.json();
		},
		onSuccess: () => {
			setRevokeId(null);
			return queryClient.invalidateQueries({ queryKey: ["invites", organizationId] });
		},
	});

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = event.currentTarget;
		const data = new FormData(form);
		const inviteRole = String(data.get("role")) as "company_admin" | "supervisor";
		const field = targetMode === "existing" ? "targetOrganizationId" : "proposedOrganizationName";
		const target = String(data.get(field) ?? "").trim();
		if (!target) return;
		const input =
			targetMode === "existing"
				? { role: inviteRole, targetOrganizationId: target }
				: { role: inviteRole, proposedOrganizationName: target };
		createInvite.mutate(input, { onSuccess: () => form.reset() });
	}

	if (organizations.isLoading) return <PageMessage message="กำลังโหลดข้อมูล..." />;
	if (!allowed)
		return <PageMessage message="หน้านี้สำหรับผู้ดูแลมหาวิทยาลัยและผู้ประสานงานเท่านั้น" />;

	return (
		<div>
			<p className="text-sm font-semibold text-primary">INVITES</p>
			<h1 className="mt-2 text-3xl font-black">คำเชิญสถานประกอบการ</h1>
			<p className="mt-2 text-muted-foreground">
				สร้างลิงก์หรือ QR Code เพื่อเชิญผู้ดูแลของสถานประกอบการเข้า {context.organization.name}
			</p>
			<form className="mt-6 rounded-2xl border bg-white p-6" onSubmit={submit}>
				<div className="flex flex-wrap gap-2" role="group" aria-label="ประเภทสถานประกอบการ">
					<Button
						type="button"
						variant={targetMode === "existing" ? "default" : "outline"}
						onClick={() => setTargetMode("existing")}
					>
						สถานประกอบการที่มีอยู่
					</Button>
					<Button
						type="button"
						variant={targetMode === "new" ? "default" : "outline"}
						onClick={() => setTargetMode("new")}
					>
						สร้างสถานประกอบการใหม่
					</Button>
				</div>
				<div className="mt-5 grid gap-4 sm:grid-cols-[1fr_260px_auto] sm:items-end">
					{targetMode === "existing" ? (
						<label className="grid gap-2 text-sm font-semibold">
							สถานประกอบการ
							<select
								name="targetOrganizationId"
								required
								className="h-11 rounded-xl border bg-background px-3 font-normal"
							>
								<option value="">เลือกสถานประกอบการ</option>
								{companies.data?.map((company) => (
									<option key={company.id} value={company.id}>
										{company.name}
									</option>
								))}
							</select>
						</label>
					) : (
						<label className="grid gap-2 text-sm font-semibold">
							ชื่อสถานประกอบการใหม่
							<input
								name="proposedOrganizationName"
								required
								minLength={2}
								maxLength={160}
								className="h-11 rounded-xl border bg-background px-3 font-normal"
								placeholder="ชื่อบริษัทหรือหน่วยงาน"
							/>
						</label>
					)}
					<label className="grid gap-2 text-sm font-semibold">
						บทบาท
						<select name="role" className="h-11 rounded-xl border bg-background px-3 font-normal">
							<option value="company_admin">{roleLabels.company_admin}</option>
							<option value="supervisor">{roleLabels.supervisor}</option>
						</select>
					</label>
					<Button disabled={createInvite.isPending}>
						<MailPlus />
						{createInvite.isPending ? "กำลังสร้าง..." : "สร้างคำเชิญ"}
					</Button>
				</div>
				{createInvite.isError && (
					<p role="alert" className="mt-4 text-sm text-destructive">
						{inviteErrorMessage((createInvite.error as InviteApiError).code)}
					</p>
				)}
			</form>
			<InviteList
				data={invites.data?.data ?? []}
				loading={invites.isLoading}
				error={invites.error}
				companies={companies.data ?? []}
				copiedId={copiedId}
				onCopy={setCopiedId}
				onRevoke={setRevokeId}
			/>
			<ConfirmationDialog
				open={Boolean(revokeId)}
				title="ยกเลิกคำเชิญนี้?"
				description="ลิงก์และ QR Code นี้จะใช้รับคำเชิญไม่ได้อีก"
				confirmLabel="ยืนยันการยกเลิก"
				cancelLabel="กลับ"
				destructive
				pending={revokeInvite.isPending}
				onCancel={() => setRevokeId(null)}
				onConfirm={() => revokeId && revokeInvite.mutate(revokeId)}
			/>
		</div>
	);
}

function InviteList({
	data,
	loading,
	error,
	companies,
	copiedId,
	onCopy,
	onRevoke,
}: {
	data: Array<{
		id: string;
		token: string;
		role: keyof typeof roleLabels;
		targetOrganizationId: string | null;
		proposedOrganizationName: string | null;
		expiresAt: string;
		redeemedAt: string | null;
		revokedAt: string | null;
	}>;
	loading: boolean;
	error: Error | null;
	companies: Array<{ id: string; name: string }>;
	copiedId: string | null;
	onCopy: (id: string) => void;
	onRevoke: (id: string) => void;
}) {
	return (
		<section className="mt-8">
			<h2 className="text-xl font-bold">คำเชิญทั้งหมด</h2>
			{loading && <p className="mt-4 text-muted-foreground">กำลังโหลดคำเชิญ...</p>}
			{error && (
				<p role="alert" className="mt-4 text-destructive">
					{inviteErrorMessage((error as InviteApiError).code)}
				</p>
			)}
			<div className="mt-4 grid gap-4">
				{data.map((invite) => {
					const status = getInviteStatus(invite);
					const company = companies.find((item) => item.id === invite.targetOrganizationId);
					const url = buildInviteUrl(window.location.origin, invite.token);
					return (
						<article
							key={invite.id}
							className="rounded-2xl border bg-white p-5 sm:flex sm:items-start sm:justify-between sm:gap-6"
						>
							<div>
								<div className="flex flex-wrap items-center gap-2">
									<h3 className="font-bold">
										{invite.proposedOrganizationName ?? company?.name ?? "สถานประกอบการ"}
									</h3>
									<span
										className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[status]}`}
									>
										{statusLabels[status]}
									</span>
								</div>
								<p className="mt-2 text-sm text-muted-foreground">
									{roleLabels[invite.role]} · หมดอายุ{" "}
									{new Date(invite.expiresAt).toLocaleString("th-TH")}
								</p>
							</div>
							{status === "pending" && (
								<div className="mt-5 flex flex-wrap items-center gap-3 sm:mt-0">
									<div className="rounded-xl border bg-white p-2" aria-label="QR Code คำเชิญ">
										<QRCodeSVG value={url} size={96} level="M" />
									</div>
									<div className="grid gap-2">
										<Button
											variant="outline"
											onClick={async () => {
												await navigator.clipboard.writeText(url);
												onCopy(invite.id);
											}}
										>
											<Copy />
											{copiedId === invite.id ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}
										</Button>
										<Button variant="destructive" onClick={() => onRevoke(invite.id)}>
											<RotateCcw />
											ยกเลิกคำเชิญ
										</Button>
									</div>
								</div>
							)}
						</article>
					);
				})}
			</div>
			{data.length === 0 && !loading && !error && (
				<div className="mt-4 rounded-2xl border bg-white p-8 text-center text-muted-foreground">
					<QrCode className="mx-auto mb-3" />
					ยังไม่มีคำเชิญ
				</div>
			)}
		</section>
	);
}

function PageMessage({ message }: { message: string }) {
	return (
		<div className="mx-auto max-w-xl rounded-3xl border bg-white p-8 text-center text-muted-foreground">
			{message}
		</div>
	);
}
