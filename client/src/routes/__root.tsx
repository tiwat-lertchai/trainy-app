import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { LanguageProvider } from "@/i18n/config";

export const Route = createRootRoute({
	component: () => (
		<LanguageProvider>
			<Outlet />
			{import.meta.env.DEV && <TanStackRouterDevtools />}
		</LanguageProvider>
	),
});
