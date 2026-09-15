import { createAuthClient } from "better-auth/react";
import { serverUrl } from "./server-url";

export const authClient = createAuthClient({ baseURL: serverUrl });
export const LINE_CALLBACK_URL = "/app";

export function signInWithLine() {
	return authClient.signIn.social({
		provider: "line",
		callbackURL: LINE_CALLBACK_URL,
	});
}
