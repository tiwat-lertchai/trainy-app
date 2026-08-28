import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./button";

export function ConfirmationDialog({
	open,
	title,
	description,
	confirmLabel,
	cancelLabel,
	destructive = false,
	pending = false,
	onConfirm,
	onCancel,
	children,
}: {
	open: boolean;
	title: string;
	description: string;
	confirmLabel: string;
	cancelLabel: string;
	destructive?: boolean;
	pending?: boolean;
	onConfirm: () => void;
	onCancel: () => void;
	children?: ReactNode;
}) {
	if (!open) return null;
	return (
		<div
			className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4"
			role="presentation"
			onMouseDown={(event) => {
				if (event.target === event.currentTarget && !pending) onCancel();
			}}
		>
			<div
				role="alertdialog"
				aria-modal="true"
				aria-labelledby="confirmation-title"
				aria-describedby="confirmation-description"
				className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-2xl"
			>
				<span
					className={`grid size-11 place-items-center rounded-xl ${destructive ? "bg-red-50 text-destructive" : "bg-amber-50 text-amber-700"}`}
				>
					<AlertTriangle />
				</span>
				<h2 id="confirmation-title" className="mt-4 text-xl font-bold">
					{title}
				</h2>
				<p id="confirmation-description" className="mt-2 text-sm leading-6 text-muted-foreground">
					{description}
				</p>
				{children}
				<div className="mt-6 flex justify-end gap-2">
					<Button variant="outline" disabled={pending} onClick={onCancel}>
						{cancelLabel}
					</Button>
					<Button
						variant={destructive ? "destructive" : "default"}
						disabled={pending}
						onClick={onConfirm}
					>
						{confirmLabel}
					</Button>
				</div>
			</div>
		</div>
	);
}
