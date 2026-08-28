import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
	return (
		<div className={cn("flex items-center gap-2.5", className)}>
			<span className="grid size-9 place-items-center rounded-xl bg-primary text-sm font-black text-primary-foreground shadow-sm shadow-primary/20">
				T
			</span>
			<span className="text-xl font-extrabold tracking-tight">Trainy</span>
		</div>
	);
}
