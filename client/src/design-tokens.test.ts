import { describe, expect, it } from "bun:test";

const css = await Bun.file(new URL("./index.css", import.meta.url)).text();

function themeBlock(selector: ":root" | ".dark") {
	const nextSelector = selector === ":root" ? "\\.dark" : "@layer";
	const match = css.match(
		new RegExp(`${selector.replace(".", "\\.")} \\{([\\s\\S]*?)\\n\\}\\n\\n${nextSelector}`),
	);
	if (!match) throw new Error(`Missing ${selector} theme block`);
	return Object.fromEntries(
		[...match[1].matchAll(/--([\w-]+):\s*(#[\da-f]{6});/gi)].map((token) => [token[1], token[2]]),
	);
}

function luminance(hex: string) {
	const channels = hex
		.slice(1)
		.match(/../g)!
		.map((channel) => Number.parseInt(channel, 16) / 255)
		.map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
	return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(first: string, second: string) {
	const firstLuminance = luminance(first);
	const secondLuminance = luminance(second);
	return (
		(Math.max(firstLuminance, secondLuminance) + 0.05) /
		(Math.min(firstLuminance, secondLuminance) + 0.05)
	);
}

describe("Trainy design tokens", () => {
	const light = themeBlock(":root");
	const dark = themeBlock(".dark");

	it("defines the documented semantic status families in both themes", () => {
		for (const theme of [light, dark]) {
			for (const token of [
				"success",
				"success-foreground",
				"success-muted",
				"warning",
				"warning-foreground",
				"warning-muted",
				"info",
				"info-foreground",
				"info-muted",
				"destructive-foreground",
				"destructive-muted",
			]) {
				expect(theme[token], `${token} is missing`).toBeDefined();
			}
		}
	});

	it("uses the required self-hosted Noto Sans Thai Looped font", () => {
		expect(css).toContain("@fontsource/noto-sans-thai-looped/thai-400.css");
		expect(css).toContain('--font-sans: "Noto Sans Thai Looped"');
		expect(css).not.toContain("Google Sans");
	});

	it("keeps essential foreground and surface pairs at WCAG AA contrast", () => {
		for (const theme of [light, dark]) {
			for (const [foreground, background] of [
				["foreground", "background"],
				["card-foreground", "card"],
				["primary-foreground", "primary"],
				["accent-foreground", "accent"],
				["muted-foreground", "background"],
			] as const) {
				expect(contrast(theme[foreground], theme[background])).toBeGreaterThanOrEqual(4.5);
			}
		}
	});
});
