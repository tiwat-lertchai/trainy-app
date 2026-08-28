import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";

const WORKSPACE_KEY = "trainy-workspace-id";

export function AcademicAdminPage() {
	const queryClient = useQueryClient();
	const [openFacultyId, setOpenFacultyId] = useState("");

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
	const role = context?.membership.role;
	const canManage = role === "university_admin";

	const faculties = useQuery({
		queryKey: ["academic", "faculties", organizationId],
		queryFn: async () => {
			const r = await apiClient.api.v1.academic[":organizationId"].faculties.$get({
				param: { organizationId: organizationId! },
			});
			if (!r.ok) throw new Error();
			return r.json();
		},
		enabled: Boolean(organizationId),
	});
	const majors = useQuery({
		queryKey: ["academic", "majors", openFacultyId],
		queryFn: async () => {
			const r = await apiClient.api.v1.academic.faculties[":facultyId"].majors.$get({
				param: { facultyId: openFacultyId },
			});
			if (!r.ok) throw new Error();
			return r.json();
		},
		enabled: Boolean(openFacultyId),
	});

	const addFaculty = useMutation({
		mutationFn: async (name: string) => {
			const r = await apiClient.api.v1.academic[":organizationId"].faculties.$post({
				param: { organizationId: organizationId! },
				json: { name },
			});
			if (!r.ok) throw new Error(`FACULTY_${r.status}`);
			return r.json();
		},
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["academic", "faculties", organizationId] }),
	});
	const addMajor = useMutation({
		mutationFn: async ({ facultyId, name }: { facultyId: string; name: string }) => {
			const r = await apiClient.api.v1.academic.faculties[":facultyId"].majors.$post({
				param: { facultyId },
				json: { name },
			});
			if (!r.ok) throw new Error(`MAJOR_${r.status}`);
			return r.json();
		},
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["academic", "majors", openFacultyId] }),
	});

	function submitFaculty(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = event.currentTarget;
		const name = String(new FormData(form).get("name") ?? "").trim();
		if (name) addFaculty.mutate(name, { onSuccess: () => form.reset() });
	}

	function submitMajor(event: FormEvent<HTMLFormElement>, facultyId: string) {
		event.preventDefault();
		const form = event.currentTarget;
		const name = String(new FormData(form).get("name") ?? "").trim();
		if (name) addMajor.mutate({ facultyId, name }, { onSuccess: () => form.reset() });
	}

	if (organizations.isLoading)
		return (
			<div className="grid min-h-80 place-items-center text-muted-foreground">
				กำลังโหลดข้อมูล...
			</div>
		);
	if (!canManage)
		return (
			<div className="mx-auto max-w-xl rounded-3xl border bg-white p-8 text-center text-muted-foreground">
				หน้านี้สำหรับผู้ดูแลมหาวิทยาลัยเท่านั้น
			</div>
		);

	return (
		<div>
			<p className="text-sm font-semibold text-primary">ACADEMIC STRUCTURE</p>
			<h1 className="mt-2 text-3xl font-black">คณะและสาขา</h1>
			<p className="mt-2 text-muted-foreground">
				จัดการรายชื่อคณะและสาขาของ {context?.organization.name} สำหรับใช้ในฟอร์มลงทะเบียนนักศึกษา
			</p>

			<form className="mt-6 flex max-w-md gap-2" onSubmit={submitFaculty}>
				<input
					name="name"
					placeholder="ชื่อคณะใหม่ เช่น คณะวิทยาศาสตร์"
					required
					minLength={2}
					maxLength={200}
					className="h-11 flex-1 rounded-xl border bg-background px-3 outline-none focus:border-primary focus:ring-3 focus:ring-primary/10"
				/>
				<Button disabled={addFaculty.isPending}>เพิ่มคณะ</Button>
			</form>
			{addFaculty.isError && (
				<p role="alert" className="mt-2 text-sm text-destructive">
					เพิ่มคณะไม่สำเร็จ อาจมีชื่อนี้อยู่แล้ว
				</p>
			)}

			{faculties.isLoading && <div className="mt-8 h-32 animate-pulse rounded-2xl bg-muted" />}
			{faculties.data?.data.length === 0 && (
				<div className="mt-8 rounded-2xl border bg-white p-10 text-center text-muted-foreground">
					ยังไม่มีคณะ เพิ่มคณะแรกด้านบนได้เลย
				</div>
			)}

			<div className="mt-6 grid gap-4">
				{faculties.data?.data.map((faculty) => {
					const open = openFacultyId === faculty.id;
					return (
						<article key={faculty.id} className="rounded-2xl border bg-white p-6">
							<button
								type="button"
								className="flex w-full items-center gap-3 text-left"
								onClick={() => setOpenFacultyId(open ? "" : faculty.id)}
							>
								<span className="grid size-11 place-items-center rounded-xl bg-[#edf3ff] text-primary">
									<GraduationCap />
								</span>
								<span className="font-bold">{faculty.name}</span>
							</button>
							{open && (
								<div className="mt-5 border-t pt-5">
									<form
										className="flex max-w-md gap-2"
										onSubmit={(event) => submitMajor(event, faculty.id)}
									>
										<input
											name="name"
											placeholder="ชื่อสาขาใหม่ เช่น วิทยาการคอมพิวเตอร์"
											required
											minLength={2}
											maxLength={200}
											className="h-10 flex-1 rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-3 focus:ring-primary/10"
										/>
										<Button size="sm" disabled={addMajor.isPending}>
											เพิ่มสาขา
										</Button>
									</form>
									{addMajor.isError && (
										<p role="alert" className="mt-2 text-sm text-destructive">
											เพิ่มสาขาไม่สำเร็จ อาจมีชื่อนี้อยู่แล้ว
										</p>
									)}
									<ul className="mt-4 flex flex-wrap gap-2">
										{majors.data?.data.map((major) => (
											<li key={major.id} className="rounded-full bg-slate-100 px-3 py-1 text-sm">
												{major.name}
											</li>
										))}
										{majors.data?.data.length === 0 && (
											<li className="text-sm text-muted-foreground">ยังไม่มีสาขาในคณะนี้</li>
										)}
									</ul>
								</div>
							)}
						</article>
					);
				})}
			</div>
		</div>
	);
}
