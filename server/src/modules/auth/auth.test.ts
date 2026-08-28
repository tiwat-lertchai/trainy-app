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
    expect(auth.options.trustedOrigins).toEqual(["http://localhost:5173"]);
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
