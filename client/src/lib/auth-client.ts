import { createAuthClient } from "better-auth/react";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

export const authClient = createAuthClient({ baseURL: SERVER_URL });

export function signInWithLine() {
	return authClient.signIn.social({
		provider: "line",
		callbackURL: `${window.location.origin}/app`,
	});
}
