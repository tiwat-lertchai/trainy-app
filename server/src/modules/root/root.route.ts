import { Hono } from "hono";

export const rootRoute = new Hono().get("/", (c) => {
  return c.json({
    name: "Trainy API",
    status: "ok",
  });
});
