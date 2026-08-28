import { describe, expect, test } from "bun:test";
import { availablePlacementActions } from "./placement-rules";

describe("placement presentation rules", () => {
	test("does not offer activation until both assignments exist", () => expect(availablePlacementActions("pending", false, true)).toEqual(["cancelled"]));
	test("keeps terminal state transitions unavailable", () => expect(availablePlacementActions("completed", true, true)).toEqual([]));
});
