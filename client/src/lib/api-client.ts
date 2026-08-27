import { hcWithType } from "server/client";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

export const apiClient = hcWithType(SERVER_URL);

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

export async function getApiStatus(
	request: ApiStatusRequest = () => apiClient.index.$get(),
) {
	const response = await request();

	if (!response.ok) {
		throw new Error(`API request failed with status ${response.status}`);
	}

	return response.json();
}
