import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ConfirmationDialog } from "./confirmation-dialog";

describe("ConfirmationDialog", () => {
	test("renders nothing while closed", () => {
		expect(
			renderToStaticMarkup(
				<ConfirmationDialog
					open={false}
					title="Confirm"
					description="Cannot be undone"
					confirmLabel="Confirm"
					cancelLabel="Cancel"
					onConfirm={() => undefined}
					onCancel={() => undefined}
				/>,
			),
		).toBe("");
	});

	test("renders an accessible alert dialog while open", () => {
		const html = renderToStaticMarkup(
			<ConfirmationDialog
				open
				title="Confirm"
				description="Cannot be undone"
				confirmLabel="Confirm"
				cancelLabel="Cancel"
				onConfirm={() => undefined}
				onCancel={() => undefined}
			/>,
		);
		expect(html).toContain('role="alertdialog"');
		expect(html).toContain('aria-modal="true"');
		expect(html).toContain("Cannot be undone");
	});
});
