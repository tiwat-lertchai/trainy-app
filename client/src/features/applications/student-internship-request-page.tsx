import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/config";
import { apiClient } from "@/lib/api-client";
import type { OrganizationRole } from "@/features/organizations/role-navigation";
import { canAccessStudentRequest } from "./application-navigation";
import { InternshipRequestPanel } from "./internship-request-panel";

const WORKSPACE_KEY = "trainy-workspace-id";

export function StudentInternshipRequestPage() {
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

	if (organizations.isLoading) return <PageMessage message={t("internshipRequests.loading")} />;
	if (organizations.isError)
		return <PageMessage message={t("internshipRequests.organizationError")} destructive />;
	if (!canAccessStudentRequest(role))
		return <PageMessage message={t("internshipRequests.studentOnly")} destructive />;

	return (
		<div>
			<Button variant="outline" asChild>
				<Link to="/app/applications">
					<ArrowLeft />
					{t("internshipRequests.backToApplications")}
				</Link>
			</Button>
			<InternshipRequestPanel organizationId={context.organization.id} role={role} />
		</div>
	);
}

function PageMessage({ message, destructive = false }: { message: string; destructive?: boolean }) {
	return (
		<div
			role={destructive ? "alert" : undefined}
			className={`rounded-2xl border bg-white p-8 text-center ${destructive ? "border-destructive/20 text-destructive" : "text-muted-foreground"}`}
		>
			{message}
		</div>
	);
}
