import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

export default defineConfig({
	plugins: [
		// Please make sure that '@tanstack/router-plugin' is passed before '@vitejs/plugin-react'
		tanstackRouter({
			target: "react",
			autoCodeSplitting: true,
		}),
		react(),
		tailwindcss(),
	],
	resolve: {
		alias: {
			"@": path.resolve(import.meta.dirname, "./src"),
		},
	},
	server: {
		// Without this, Vite's default allow-root walks up to the monorepo
		// root (via the workspace package.json/lockfile), which lets this
		// dev server serve files from ../server (and anything else in the
		// repo) through /@fs/. Scope it to this package only.
		fs: {
			allow: [
				path.resolve(import.meta.dirname, "."),
				// Bun hoists this self-hosted font package to the monorepo root.
				path.resolve(import.meta.dirname, "../node_modules/@fontsource/google-sans"),
			],
		},
	},
});
