import { Env, logger as HonoPinoLogger } from "hono-pino";
import pino from "pino";
import { MiddlewareHandler } from "hono/types";
import { AppBindings } from "@/lib/types";
import { Context } from "hono";

export function logger() {
  return ((c, next) =>
    HonoPinoLogger({
      pino: pino(
        c.env.NODE_ENV === "production"
          ? undefined
          : {
              transport: {
                target: "pino-pretty",
                options: {
                  colorize: true,
                },
              },
              level: c.env.LOG_LEVEL || "info",
            }
      ),
      http: {
        reqId: () => crypto.randomUUID(),
      },
    })(
      c as unknown as Context<Env>,
      next
    )) satisfies MiddlewareHandler<AppBindings>;
}
