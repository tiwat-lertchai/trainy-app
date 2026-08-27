import { createMiddleware } from "hono/factory";
import { AppError } from "../lib/app-error";
import { auth } from "../modules/auth/auth";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
};

export type AuthVariables = {
  authUser: AuthUser;
};

export const requireAuth = createMiddleware<{
  Variables: AuthVariables;
}>(async (c, next) => {
  const authSession = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!authSession) {
    throw new AppError("Authentication is required", 401, "UNAUTHORIZED");
  }

  c.set("authUser", authSession.user);
  await next();
});
