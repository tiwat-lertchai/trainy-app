import { describe, expect, test } from "bun:test";
import { resolveLocale } from "./config";
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
});
