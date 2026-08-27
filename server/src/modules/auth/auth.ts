import { betterAuth } from "better-auth/minimal";
import type { Auth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { genericOAuth, line } from "better-auth/plugins/generic-oauth";
import { env } from "../../config/env";
import { db } from "../../db";
import * as schema from "../../db/schema";

const isProduction = env.NODE_ENV === "production";

export const lineProvider = line({
  providerId: "line",
  clientId: env.LINE_CHANNEL_ID,
  clientSecret: env.LINE_CHANNEL_SECRET,
  scopes: ["openid", "profile", "email"],
  pkce: true,
});

const authOptions = {
  appName: "Trainy",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [...env.CORS_ORIGINS],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  advanced: {
    useSecureCookies: isProduction,
    defaultCookieAttributes: {
      httpOnly: true,
      secure: isProduction,
      // OAuth redirects from LINE are cross-site top-level navigations. Lax
      // keeps the state cookie available while retaining CSRF protection.
      sameSite: "lax" as const,
      path: "/",
    },
  },
  plugins: [
    genericOAuth({
      config: [lineProvider],
    }),
  ],
};

// The explicit public Auth type keeps generated declaration files portable and
// prevents TypeScript from referencing Better Auth's internal module paths.
export const auth: Auth<typeof authOptions> = betterAuth(authOptions);
