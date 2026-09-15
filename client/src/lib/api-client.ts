import { hcWithType } from "server/client";
import { serverUrl } from "./server-url";

export function createApiClient(requestFetch: typeof fetch = fetch) {
	return hcWithType(serverUrl, {
		fetch: requestFetch,
		init: { credentials: "include" },
	});
}

export const apiClient = createApiClient();

type ApiStatus = {
	name: string;
	status: string;
};

type ApiStatusResponse = {
	ok: boolean;
	status: number;
	json: () => Promise<ApiStatus>;
};

type ApiStatusRequest = () => Promise<ApiStatusResponse>;

export async function getApiStatus(request: ApiStatusRequest = () => apiClient.index.$get()) {
	const response = await request();

	if (!response.ok) {
		throw new Error(`API request failed with status ${response.status}`);
	}

	return response.json();
}
