import { z } from "zod";
import "dotenv/config";

const EnvSchema = z.object({
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]),
  NODE_ENV: z.enum(["development", "production"]),
  OPENAI_API_KEY: z.string(),
  UPSTASH_VECTOR_URL: z.string(),
  UPSTASH_VECTOR_TOKEN: z.string(),
});

export type Environment = z.infer<typeof EnvSchema>;

export function parseEnv(data: any) {
  const { data: env, error } = EnvSchema.safeParse(data);

  if (error) {
    const errMessage = `❌ Invalid Env\n${Object.entries(
      error.flatten().fieldErrors
    )
      .map(([key, value]) => `${key}: ${value}`)
      .join("|")}`;
    throw new Error(errMessage);
  }

  return env;
}
