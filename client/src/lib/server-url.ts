type ServerUrlOptions = {
	isProduction: boolean;
	browserOrigin?: string;
	configuredUrl?: string;
};

export function resolveServerUrl({
	isProduction,
	browserOrigin,
	configuredUrl,
}: ServerUrlOptions): string {
	if (isProduction && browserOrigin) return browserOrigin;
	return configuredUrl || browserOrigin || "http://localhost:3000";
}

export const serverUrl = resolveServerUrl({
	isProduction: import.meta.env.PROD,
	browserOrigin: typeof window === "undefined" ? undefined : window.location.origin,
	configuredUrl: import.meta.env.VITE_SERVER_URL,
});
