import { describe, expect, it } from "bun:test";
import { getApiStatus } from "./api-client";

function createResponse(body: unknown, status: number): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

describe("getApiStatus", () => {
	it("returns the parsed API status when the request succeeds", async () => {
		const request = async () =>
			createResponse({ name: "Trainy API", status: "ok" }, 200);

		await expect(getApiStatus(request)).resolves.toEqual({
			name: "Trainy API",
			status: "ok",
		});
	});

	it("throws an error containing the response status when the request fails", async () => {
		const request = async () => createResponse({}, 503);

		await expect(getApiStatus(request)).rejects.toThrow(
			"API request failed with status 503",
		);
	});
});
