import { describe, expect, it } from "bun:test";
import { landingSections } from "./index";

describe("landing page navigation", () => {
	it("links every major product section in narrative order", () => {
		expect(landingSections).toEqual(["features", "workflow", "roles", "security"]);
	});
});
