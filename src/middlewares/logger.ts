import env from "@/env";
import { logger as HonoPinoLogger } from "hono-pino";
import pino from "pino";

export function logger() {
  return HonoPinoLogger({
    pino: pino(
      env.NODE_ENV === "production"
        ? undefined
        : {
            transport: {
              target: "pino-pretty",
              options: {
                colorize: true,
              },
            },
            level: env.LOG_LEVEL || "info",
          }
    ),
    http: {
      reqId: () => crypto.randomUUID(),
    },
  });
}
