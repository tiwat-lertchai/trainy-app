import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { getApiStatus } from "@/lib/api-client";

export const Route = createFileRoute("/")({
	component: Index,
});

function Index() {
	const {
		data,
		error,
		isPending,
		mutate: checkApi,
	} = useMutation({
		mutationFn: getApiStatus,
	});

	return (
		<main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 px-6 text-center">
			<div className="space-y-2">
				<p className="text-sm font-medium uppercase tracking-[0.25em] text-muted-foreground">
					Student internship management
				</p>
				<h1 className="text-5xl font-black">Trainy</h1>
				<p className="text-muted-foreground">
					The application foundation is ready. Check the API connection before
					continuing.
				</p>
			</div>

			<Button onClick={() => checkApi()} disabled={isPending}>
				{isPending ? "Checking API..." : "Check API connection"}
			</Button>

			{data && (
				<div className="w-full rounded-lg border bg-card p-4 text-left">
					<p className="font-semibold">{data.name}</p>
					<p className="text-sm text-muted-foreground">
						Status: {data.status}
					</p>
				</div>
			)}

			{error && (
				<p role="alert" className="text-sm text-destructive">
					{error.message}
				</p>
			)}
		</main>
	);
}

export default Index;
