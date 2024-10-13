import { createRouter } from "@/lib/create-app";
import { streamText as honoStream } from "hono/streaming";
import { streamText, CoreMessage, tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { validator } from "hono/validator";
import { z } from "zod";
import { getContext } from "@/lib/vector";

const chatSchema = z.object({
  messages: z.custom<CoreMessage[]>(),
  namespace: z.string().default("udel"),
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
  const { messages, namespace } = c.req.valid("json");

  return honoStream(c, async (stream) => {
    const result = await streamText({
      model: openai("gpt-4o-mini"),
      messages,
      maxSteps: 5,
      tools: {
        getInformation: tool({
          description:
            "Get the context of the conversation by querying the vector database only when needed",
          parameters: z.object({
            query: z
              .string()
              .describe("The query to search the vector database"),
          }),
          execute: async ({ query }) => {
            const context = await getContext(query, namespace, 3000, 0.7);

            //DO SOMETHING WITH RESOURCE
            let resource = new Set<string>();

            let docs: string[] = [];

            context.forEach((match) => {
              resource.add((match.metadata as { file_name: string }).file_name);

              docs.push((match.metadata as any).text);
            });

            const contextText = docs.join("\n").substring(0, 3000);

            const data = `
            You are a helpful assistant. Use the following context to answer the user's question. If the context doesn't contain relevant information, use your general knowledge but mention that the answer is not based on the given context. Context: ${contextText}. Answer the user's question based on this context.
  
            `;

            return data;
          },
        }),
      },
    });

    // Mark the response as a v1 data stream:
    c.header("X-Vercel-AI-Data-Stream", "v1");
    c.header("Content-Type", "text/plain; charset=utf-8");

    await stream.pipe(result.toDataStream());
  });
});

export default chatRoute;
