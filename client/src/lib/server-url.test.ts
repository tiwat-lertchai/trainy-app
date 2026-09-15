import { describe, expect, it } from "bun:test";
import { resolveServerUrl } from "./server-url";

describe("resolveServerUrl", () => {
	it("always uses the page origin in production", () => {
		expect(
			resolveServerUrl({
				isProduction: true,
				browserOrigin: "https://trainy.example",
				configuredUrl: "http://localhost:8081",
			}),
		).toBe("https://trainy.example");
	});

	it("allows an explicit API URL during development", () => {
		expect(
			resolveServerUrl({
				isProduction: false,
				browserOrigin: "http://localhost:5173",
				configuredUrl: "http://localhost:3000",
			}),
		).toBe("http://localhost:3000");
	});

	it("has a server-side fallback for tests and tooling", () => {
		expect(resolveServerUrl({ isProduction: false })).toBe("http://localhost:3000");
	});
});
