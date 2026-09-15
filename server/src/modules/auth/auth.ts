import { betterAuth } from "better-auth/minimal";
import type { Auth, BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { genericOAuth, line } from "better-auth/plugins/generic-oauth";
import { env } from "../../config/env";
import { db } from "../../db";
import * as schema from "../../db/schema";
import { queueAuthEmail } from "../../lib/auth-email";

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
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    resetPasswordTokenExpiresIn: 30 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      queueAuthEmail({
        to: user.email,
        subject: "Reset your Trainy password",
        text: `A password reset was requested for your Trainy account. Open this link within 30 minutes: ${url}\n\nIf you did not request this, you can ignore this email.`,
      });
    },
  },
  emailVerification: {
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      queueAuthEmail({
        to: user.email,
        subject: "Verify your Trainy email",
        text: `Verify your email address to finish setting up Trainy: ${url}\n\nIf you did not create this account, you can ignore this email.`,
      });
    },
  },
  rateLimit: {
    enabled: env.NODE_ENV !== "test",
    window: 60,
    max: 60,
    storage: "memory" as const,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 300, max: 3 },
      "/request-password-reset": { window: 300, max: 3 },
      "/reset-password": { window: 300, max: 5 },
    },
  },
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
} satisfies BetterAuthOptions;

// The explicit public Auth type keeps generated declaration files portable and
// prevents TypeScript from referencing Better Auth's internal module paths.
export const auth: Auth<typeof authOptions> = betterAuth(authOptions);
