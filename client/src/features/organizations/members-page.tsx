import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserRoundCog, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useLanguage } from "@/i18n/config";
import { apiClient } from "@/lib/api-client";
import type { OrganizationRole } from "./role-navigation";

const WORKSPACE_KEY = "trainy-workspace-id";
const universityRoles: OrganizationRole[] = [
	"university_admin",
	"coordinator",
	"advisor",
	"student",
];
const companyRoles: OrganizationRole[] = ["company_admin", "supervisor"];
const roleLabels: Record<OrganizationRole, string> = {
	university_admin: "ผู้ดูแลมหาวิทยาลัย",
	coordinator: "ผู้ประสานงาน",
	advisor: "อาจารย์ที่ปรึกษา",
	student: "นักศึกษา",
	company_admin: "ผู้ดูแลสถานประกอบการ",
	supervisor: "ผู้ควบคุมการฝึกงาน",
};

export function MembersPage() {
	const { t } = useLanguage();
	const queryClient = useQueryClient();
	const [suspendingId, setSuspendingId] = useState<string | null>(null);
	const organizations = useQuery({
		queryKey: ["organizations"],
		queryFn: async () => {
			const r = await apiClient.api.v1.organizations.$get();
			if (!r.ok) throw new Error();
			return r.json();
		},
	});
	const context =
		organizations.data?.data.find(
			(item) => item.organization.id === localStorage.getItem(WORKSPACE_KEY),
		) ?? organizations.data?.data[0];
	const organizationId = context?.organization.id;
	const isAdmin =
		context?.membership.role === "university_admin" || context?.membership.role === "company_admin";
	const availableRoles = context?.organization.type === "company" ? companyRoles : universityRoles;

	const members = useQuery({
		queryKey: ["organizations", organizationId, "members"],
		queryFn: async () => {
			const r = await apiClient.api.v1.organizations[":organizationId"].members.$get({
				param: { organizationId: organizationId! },
			});
			if (!r.ok) throw new Error();
			return r.json();
		},
		enabled: Boolean(organizationId) && isAdmin,
	});

	const addMember = useMutation({
		mutationFn: async (input: { userId: string; role: OrganizationRole }) => {
			const r = await apiClient.api.v1.organizations[":organizationId"].members.$post({
				param: { organizationId: organizationId! },
				json: input,
			});
			if (!r.ok) throw new Error(`MEMBER_${r.status}`);
			return r.json();
		},
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["organizations", organizationId, "members"] }),
	});
	const updateMember = useMutation({
		mutationFn: async (input: {
			membershipId: string;
			role?: OrganizationRole;
			status?: "active" | "suspended";
		}) => {
			const r = await apiClient.api.v1.organizations[":organizationId"].members[
				":membershipId"
			].$patch({
				param: { organizationId: organizationId!, membershipId: input.membershipId },
				json: { role: input.role, status: input.status },
			});
			if (!r.ok) throw new Error(`MEMBER_${r.status}`);
			return r.json();
		},
		onSuccess: () => {
			setSuspendingId(null);
			return queryClient.invalidateQueries({
				queryKey: ["organizations", organizationId, "members"],
			});
		},
	});

	function submitAddMember(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = event.currentTarget;
		const data = new FormData(form);
		const userId = String(data.get("userId") ?? "").trim();
		const role = String(data.get("role")) as OrganizationRole;
		if (userId) addMember.mutate({ userId, role }, { onSuccess: () => form.reset() });
	}

	if (organizations.isLoading)
		return (
			<div className="grid min-h-80 place-items-center text-muted-foreground">
				กำลังโหลดข้อมูล...
			</div>
		);
	if (!isAdmin)
		return (
			<div className="mx-auto max-w-xl rounded-3xl border bg-white p-8 text-center text-muted-foreground">
				หน้านี้สำหรับผู้ดูแลองค์กรเท่านั้น
			</div>
		);

	return (
		<div>
			<p className="text-sm font-semibold text-primary">MEMBERS</p>
			<h1 className="mt-2 text-3xl font-black">สมาชิกองค์กร</h1>
			<p className="mt-2 text-muted-foreground">
				จัดการสิทธิ์และสถานะสมาชิกของ {context?.organization.name}
			</p>

			<form
				className="mt-6 grid gap-3 rounded-2xl border bg-white p-6 sm:grid-cols-[1fr_220px_auto] sm:items-end"
				onSubmit={submitAddMember}
			>
				<label className="grid gap-2 text-sm font-semibold">
					รหัสผู้ใช้ (User ID)
					<input
						name="userId"
						required
						placeholder="รหัสบัญชีผู้ใช้ที่มีอยู่แล้วในระบบ"
						className="h-11 rounded-xl border bg-background px-3 font-normal outline-none focus:border-primary focus:ring-3 focus:ring-primary/10"
					/>
				</label>
				<label className="grid gap-2 text-sm font-semibold">
					บทบาท
					<select name="role" className="h-11 rounded-xl border bg-background px-3 font-normal">
						{availableRoles.map((role) => (
							<option key={role} value={role}>
								{roleLabels[role]}
							</option>
						))}
					</select>
				</label>
				<Button disabled={addMember.isPending}>เพิ่มสมาชิก</Button>
			</form>
			{addMember.isError && (
				<p role="alert" className="mt-2 text-sm text-destructive">
					เพิ่มสมาชิกไม่สำเร็จ ตรวจสอบรหัสผู้ใช้และสิทธิ์อีกครั้ง
				</p>
			)}

			{members.isLoading && <div className="mt-8 h-32 animate-pulse rounded-2xl bg-muted" />}
			{members.data?.data.length === 0 && (
				<div className="mt-8 rounded-2xl border bg-white p-10 text-center text-muted-foreground">
					ยังไม่มีสมาชิก
				</div>
			)}

			<div className="mt-6 grid gap-3">
				{members.data?.data.map((member) => {
					const view = member as typeof member & {
						user?: { id: string; name: string; email: string };
					};
					return (
						<article
							key={member.id}
							className="flex flex-col gap-3 rounded-2xl border bg-white p-5 sm:flex-row sm:items-center sm:justify-between"
						>
							<div className="flex items-center gap-3">
								<span className="grid size-11 place-items-center rounded-xl bg-[#edf3ff] text-primary">
									<UsersRound />
								</span>
								<div>
									<p className="font-bold">{view.user?.name ?? member.userId}</p>
									<p className="text-sm text-muted-foreground">
										{view.user?.email ?? member.userId}
									</p>
								</div>
							</div>
							<div className="flex flex-wrap items-center gap-2">
								<select
									className="h-10 rounded-lg border bg-white px-3 text-sm"
									value={member.role}
									disabled={updateMember.isPending}
									onChange={(event) =>
										updateMember.mutate({
											membershipId: member.id,
											role: event.target.value as OrganizationRole,
										})
									}
								>
									{availableRoles.map((role) => (
										<option key={role} value={role}>
											{roleLabels[role]}
										</option>
									))}
								</select>
								<span
									className={`rounded-full px-3 py-1 text-xs font-semibold ${member.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
								>
									{member.status === "active" ? "ใช้งานอยู่" : "ระงับการใช้งาน"}
								</span>
								<Button
									variant="outline"
									size="sm"
									disabled={updateMember.isPending}
									onClick={() =>
										member.status === "active"
											? setSuspendingId(member.id)
											: updateMember.mutate({ membershipId: member.id, status: "active" })
									}
								>
									<UserRoundCog className="size-4" />
									{member.status === "active" ? "ระงับ" : "เปิดใช้งาน"}
								</Button>
							</div>
						</article>
					);
				})}
			</div>
			{updateMember.isError && (
				<p role="alert" className="mt-3 text-sm text-destructive">
					ดำเนินการไม่สำเร็จ (อาจเป็นผู้ดูแลคนสุดท้ายขององค์กร)
				</p>
			)}
			<ConfirmationDialog
				open={Boolean(suspendingId)}
				title={t("confirm.terminalTitle")}
				description={t("confirm.irreversible")}
				confirmLabel={t("common.confirm")}
				cancelLabel={t("common.cancel")}
				destructive
				pending={updateMember.isPending}
				onCancel={() => setSuspendingId(null)}
				onConfirm={() =>
					suspendingId && updateMember.mutate({ membershipId: suspendingId, status: "suspended" })
				}
			/>
		</div>
	);
}
