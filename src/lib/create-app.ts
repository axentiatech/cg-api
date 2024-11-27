import { Hono } from "hono";
import { notFound, onError, serveEmojiFavicon } from "stoker/middlewares";
import { logger } from "@/middlewares/logger";
import { AppBindings } from "./types";
import indexRoute from "@/routes/index.route";
import chatRoute from "@/routes/chat.route";
import { cors } from "hono/cors";
import { parseEnv } from "@/env";

export function createRouter() {
  const router = new Hono<AppBindings>({ strict: false });
  return router;
}

export default function createApp() {
  const app = createRouter()
    .use((c, next) => {
      c.env = parseEnv(Object.assign(c.env || {}, process.env));
      return next();
    })
    .use(logger())
    .use(cors({ origin: "*" }))
    .use(serveEmojiFavicon("🎓"))
    .route("/", indexRoute)
    .basePath("/api")
    .notFound(notFound)
    .onError(onError)
    .route("/chat", chatRoute);

  return app;
}
