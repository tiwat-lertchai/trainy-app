import { describe, expect, test } from "bun:test";
import { interpolateMessage, resolveLocale } from "./config";
import { messages } from "./messages";

describe("internationalization", () => {
	test("uses Thai as the default and accepts English", () => {
		expect(resolveLocale(null)).toBe("th");
		expect(resolveLocale("unknown")).toBe("th");
		expect(resolveLocale("en")).toBe("en");
	});

	test("keeps translation keys aligned", () => {
		expect(Object.keys(messages.th).sort()).toEqual(Object.keys(messages.en).sort());
	});

	test("interpolates named values without changing unresolved placeholders", () => {
		expect(
			interpolateMessage("Hello, {name}. You have {count} tasks.", { name: "Narin", count: 2 }),
		).toBe("Hello, Narin. You have 2 tasks.");
		expect(interpolateMessage("Workspace: {name}")).toBe("Workspace: {name}");
	});
});
