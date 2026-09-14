import { describe, expect, it } from "bun:test";
import { badgeVariants } from "./badge";

describe("badge variants", () => {
	it("maps workflow states to semantic Trainy colors", () => {
		expect(badgeVariants({ variant: "success" })).toContain("bg-success-muted");
		expect(badgeVariants({ variant: "warning" })).toContain("bg-warning-muted");
		expect(badgeVariants({ variant: "destructive" })).toContain("bg-destructive-muted");
		expect(badgeVariants({ variant: "neutral" })).toContain("bg-neutral-status-muted");
	});
});
