import { createRouter } from "@/lib/create-app";
import { streamText as honoStream } from "hono/streaming";
import { streamText, CoreMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { validator } from "hono/validator";
import { z } from "zod";

const chatSchema = z.object({
  messages: z.custom<CoreMessage[]>(),
});

const chatRoute = createRouter();

function validatorMiddleware() {
  return validator("json", (value, c) => {
    const parsed = chatSchema.safeParse(value);
    if (!parsed.success) {
      return c.text("Invalid!", 401);
    }

    return parsed.data;
  });
}

chatRoute.post("/", validatorMiddleware(), async (c) => {
  const { messages } = c.req.valid("json");

  return honoStream(c, async (stream) => {
    const result = await streamText({
      model: openai("gpt-4o-mini"),
      messages,
    });

    // Mark the response as a v1 data stream:
    c.header("X-Vercel-AI-Data-Stream", "v1");
    c.header("Content-Type", "text/plain; charset=utf-8");

    await stream.pipe(result.toDataStream());
  });
});

export default chatRoute;
