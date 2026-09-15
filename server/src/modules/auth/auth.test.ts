import { beforeAll, describe, expect, it } from "bun:test";
import type { auth as Auth, lineProvider as LineProvider } from "./auth";

let auth: typeof Auth;
let lineProvider: typeof LineProvider;

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.CORS_ORIGINS = "http://localhost:5173";
  process.env.DATABASE_URL = "postgresql://test:test@localhost/test?sslmode=require";
  process.env.BETTER_AUTH_SECRET = "test-secret-that-is-longer-than-thirty-two-characters";
  process.env.BETTER_AUTH_URL = "http://localhost:3000";
  process.env.LINE_CHANNEL_ID = "test-line-channel-id";
  process.env.LINE_CHANNEL_SECRET = "test-line-channel-secret";

  ({ auth, lineProvider } = await import("./auth"));
});

describe("Better Auth security", () => {
  it("uses an OAuth-compatible SameSite cookie policy", () => {
    expect(auth.options.advanced?.defaultCookieAttributes).toMatchObject({
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: false,
    });
    expect(auth.options.trustedOrigins).toHaveLength(1);
    expect(() => new URL(String(auth.options.trustedOrigins?.[0]))).not.toThrow();
  });

  it("requires verified email and strong passwords for credential sign-in", () => {
    expect(auth.options.emailAndPassword).toMatchObject({
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      resetPasswordTokenExpiresIn: 1800,
      revokeSessionsOnPasswordReset: true,
    });
  });

  it("limits credential and password-reset endpoints", () => {
    expect(auth.options.rateLimit?.customRules).toMatchObject({
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 300, max: 3 },
      "/request-password-reset": { window: 300, max: 3 },
      "/reset-password": { window: 300, max: 5 },
    });
  });
});

describe("LINE Login provider", () => {
  it("uses LINE Login v2.1 with PKCE and identity scopes", () => {
    expect(lineProvider).toMatchObject({
      providerId: "line",
      accountIssuer: "https://access.line.me",
      authorizationUrl: "https://access.line.me/oauth2/v2.1/authorize",
      tokenUrl: "https://api.line.me/oauth2/v2.1/token",
      userInfoUrl: "https://api.line.me/oauth2/v2.1/userinfo",
      scopes: ["openid", "profile", "email"],
      pkce: true,
    });
  });
});
