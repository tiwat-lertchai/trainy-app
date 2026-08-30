export type OnboardingRole =
	"student" | "advisor" | "coordinator" | "university_admin" | "company_admin" | "supervisor";

export const roleOptions: Array<{
	value: OnboardingRole;
	labelKey: MessageKey;
	descriptionKey: MessageKey;
}> = [
	{
		value: "student",
		labelKey: "onboarding.role.student",
		descriptionKey: "onboarding.role.studentDetail",
	},
	{
		value: "advisor",
		labelKey: "onboarding.role.advisor",
		descriptionKey: "onboarding.role.universityReview",
	},
	{
		value: "coordinator",
		labelKey: "onboarding.role.coordinator",
		descriptionKey: "onboarding.role.universityReview",
	},
	{
		value: "university_admin",
		labelKey: "onboarding.role.universityAdmin",
		descriptionKey: "onboarding.role.cwieReview",
	},
	{
		value: "company_admin",
		labelKey: "onboarding.role.companyAdmin",
		descriptionKey: "onboarding.role.companyReview",
	},
	{
		value: "supervisor",
		labelKey: "onboarding.role.supervisor",
		descriptionKey: "onboarding.role.companyAdminReview",
	},
];

export function organizationTypeForRole(role: OnboardingRole) {
	if (role === "company_admin") return null;
	return role === "supervisor" ? "company" : "university";
}

export function organizationFieldKey(type: "university" | "company" | null): MessageKey {
	return type === "company"
		? "onboarding.companyOrganization"
		: "onboarding.universityOrganization";
}

export function facultiesEnabledForRole(role: OnboardingRole) {
	return role === "student" || role === "advisor";
}

export function isImmediatelyApproved(role: OnboardingRole) {
	return role === "student";
}
import type { MessageKey } from "@/i18n/messages";
