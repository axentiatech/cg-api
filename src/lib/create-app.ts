import { Hono } from "hono";
import { notFound, onError, serveEmojiFavicon } from "stoker/middlewares";
import { logger } from "@/middlewares/logger";
import { AppBindings } from "./types";
import indexRoute from "@/routes/index.route";

export function createRouter() {
  const router = new Hono<AppBindings>({ strict: false });
  return router;
}

export default function createApp() {
  const app = createRouter()
    .basePath("/api")
    .use("*", logger())
    .use("*", serveEmojiFavicon("🎓"))
    .notFound(notFound)
    .onError(onError)
    .route("/", indexRoute);

  return app;
}
