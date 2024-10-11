import { z, ZodError } from "zod";
import "dotenv/config";

const EnvSchema = z.object({
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]),
  NODE_ENV: z.enum(["development", "production"]),
  OPENAI_API_KEY: z.string(),
});

export type Env = z.infer<typeof EnvSchema>;

let env: Env;

try {
  env = EnvSchema.parse(process.env);
} catch (e) {
  const error = e as ZodError;
  console.log("❌ Invalid Env");
  console.log(error.flatten().fieldErrors);
  process.exit(1);
}

export default env;
