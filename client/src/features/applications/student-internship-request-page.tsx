import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/config";
import { apiClient } from "@/lib/api-client";
import type { OrganizationRole } from "@/features/organizations/role-navigation";
import { canAccessStudentRequest } from "./application-navigation";
import { InternshipRequestPanel } from "./internship-request-panel";
import { loadStudentProfile } from "@/features/student-profile/student-profile-api";

const WORKSPACE_KEY = "trainy-workspace-id";

export function StudentInternshipRequestPage({ view = "active" }: { view?: "active" | "history" }) {
	const { t } = useLanguage();
	const organizations = useQuery({
		queryKey: ["organizations"],
		queryFn: async () => {
			const response = await apiClient.api.v1.organizations.$get();
			if (!response.ok) throw new Error("ORGANIZATIONS_FAILED");
			return response.json();
		},
	});
	const memberships = organizations.data?.data ?? [];
	const context =
		memberships.find((item) => item.organization.id === localStorage.getItem(WORKSPACE_KEY)) ??
		memberships[0];
	const role = context?.membership.role as OrganizationRole | undefined;
	const studentProfile = useQuery({
		queryKey: ["student-profile", "me"],
		queryFn: loadStudentProfile,
		enabled: role === "student",
	});

	if (organizations.isLoading) return <PageMessage message={t("internshipRequests.loading")} />;
	if (organizations.isError)
		return <PageMessage message={t("internshipRequests.organizationError")} destructive />;
	if (!canAccessStudentRequest(role))
		return <PageMessage message={t("internshipRequests.studentOnly")} destructive />;
	if (studentProfile.isLoading) return <PageMessage message={t("studentProfile.loading")} />;
	if (studentProfile.data?.complete === false)
		return (
			<div className="rounded-2xl border border-warning/30 bg-warning-muted p-8 text-center text-warning-foreground">
				<h1 className="text-xl font-bold">{t("studentProfile.requiredTitle")}</h1>
				<p className="mt-2">{t("studentProfile.requiredDetail")}</p>
				<Button className="mt-5" asChild>
					<Link to="/app/profile">{t("studentProfile.completeNow")}</Link>
				</Button>
			</div>
		);

	return (
		<div>
			<Button variant="outline" asChild>
				<Link to="/app/applications">
					<ArrowLeft />
					{t("internshipRequests.backToApplications")}
				</Link>
			</Button>
			<InternshipRequestPanel organizationId={context.organization.id} role={role} view={view} />
		</div>
	);
}

function PageMessage({ message, destructive = false }: { message: string; destructive?: boolean }) {
	return (
		<div
			role={destructive ? "alert" : undefined}
			className={`rounded-2xl border bg-card p-8 text-center ${destructive ? "border-destructive/20 text-destructive" : "text-muted-foreground"}`}
		>
			{message}
		</div>
	);
}
