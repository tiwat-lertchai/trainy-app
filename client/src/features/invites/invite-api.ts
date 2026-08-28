import { apiClient } from "@/lib/api-client";

export class InviteApiError extends Error {
	constructor(public readonly code?: string) {
		super(code ?? "INVITE_REQUEST_FAILED");
	}
}

export async function throwInviteError(response: { json: () => Promise<unknown> }) {
	let code: string | undefined;
	try {
		const body = (await response.json()) as { error?: { code?: string } };
		code = body.error?.code;
	} catch {
		// A non-JSON upstream failure still receives the safe generic UI message.
	}
	throw new InviteApiError(code);
}

export async function loadOrganizationContexts() {
	const response = await apiClient.api.v1.organizations.$get();
	if (!response.ok) await throwInviteError(response);
	return response.json();
}

export async function loadCompanies() {
	const response = await apiClient.api.v1.onboarding.organizations.$get();
	if (!response.ok) await throwInviteError(response);
	const body = await response.json();
	return body.data.filter((organization) => organization.type === "company");
}
