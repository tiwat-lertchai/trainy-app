// Bun uses the default export to start the server. Named exports are kept for
// the typed Hono client and for tests that call the app without opening a port.
export { app, type AppType } from "./app";
export { app as default } from "./app";
