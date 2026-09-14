import { useEffect, useId, useRef, type ReactNode } from "react";
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
	const titleId = useId();
	const descriptionId = useId();
	const dialogRef = useRef<HTMLDivElement>(null);
	const cancelRef = useRef<HTMLButtonElement>(null);
	const onCancelRef = useRef(onCancel);
	const pendingRef = useRef(pending);
	useEffect(() => {
		onCancelRef.current = onCancel;
		pendingRef.current = pending;
	}, [onCancel, pending]);
	useEffect(() => {
		if (!open) return;
		const returnTarget =
			document.activeElement instanceof HTMLElement ? document.activeElement : null;
		const dialog = dialogRef.current;
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		cancelRef.current?.focus();
		function onKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape" && !pendingRef.current) {
				event.preventDefault();
				onCancelRef.current();
				return;
			}
			if (event.key !== "Tab" || !dialog) return;
			const focusable = Array.from(
				dialog.querySelectorAll<HTMLElement>(
					'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
				),
			);
			if (focusable.length === 0) return;
			const first = focusable[0];
			const last = focusable[focusable.length - 1];
			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first.focus();
			}
		}
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("keydown", onKeyDown);
			document.body.style.overflow = previousOverflow;
			returnTarget?.focus();
		};
	}, [open]);
	if (!open) return null;
	return (
		<div
			className="fixed inset-0 z-50 flex items-end bg-foreground/55 backdrop-blur-xs sm:grid sm:place-items-center sm:p-4"
			role="presentation"
			onMouseDown={(event) => {
				if (event.target === event.currentTarget && !pending) onCancel();
			}}
		>
			<div
				ref={dialogRef}
				role="alertdialog"
				aria-modal="true"
				aria-labelledby={titleId}
				aria-describedby={descriptionId}
				className="w-full max-w-md rounded-t-2xl border bg-popover p-6 text-popover-foreground shadow-2xl sm:rounded-2xl"
			>
				<span
					className={`grid size-11 place-items-center rounded-xl ${destructive ? "bg-destructive-muted text-destructive" : "bg-warning-muted text-warning-foreground"}`}
				>
					<AlertTriangle />
				</span>
				<h2 id={titleId} className="mt-4 text-xl font-bold">
					{title}
				</h2>
				<p id={descriptionId} className="mt-2 text-sm leading-6 text-muted-foreground">
					{description}
				</p>
				{children}
				<div className="mt-6 flex justify-end gap-2">
					<Button ref={cancelRef} variant="outline" disabled={pending} onClick={onCancel}>
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
