import { createRouter } from "@/lib/create-app";

const indexRoute = createRouter();

indexRoute.get("/", (c) => {
  return c.text("Hello Hono!");
});

export default indexRoute;
