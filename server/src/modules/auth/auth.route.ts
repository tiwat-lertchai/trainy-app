import { Hono } from "hono";
import { auth } from "./auth";

// Better Auth consumes the raw Web Standard Request and returns a standard
// Response, so no Hono-specific adapter is needed here.
export const authRoute = new Hono().all("/*", (c) => {
  return auth.handler(c.req.raw);
});
