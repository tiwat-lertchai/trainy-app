import { expect, test } from "bun:test";
import { countUnread } from "./notification-rules";

test("counts only unread notifications", () => {
	expect(countUnread([{ readAt: null }, { readAt: "2026-08-28T00:00:00.000Z" }])).toBe(1);
});
