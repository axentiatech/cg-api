import { openai } from "@ai-sdk/openai";
import {
  experimental_wrapLanguageModel as wrapLanguageModel,
  Experimental_LanguageModelV1Middleware as LanguageModelV1Middleware,
  generateObject,
  generateText,
  embed,
} from "ai";
import { z } from "zod";
import { index } from "./vector";

const namespaceSchema = z.object({
  data: z.object({
    namespace: z.string().min(1),
  }),
});

type Metadata = {
  _pageContentLC: string;
  title: string;
  source: string;
};

const ragMiddleware: LanguageModelV1Middleware = {
  transformParams: async ({ params }) => {
    const { prompt: messages, providerMetadata } = params;

    const { success, data } = namespaceSchema.safeParse(providerMetadata);

    if (!success || !data) return params;

    const {
      data: { namespace },
    } = data;

    //get the last message
    const recentMessage = messages.pop();

    //return if the message is not from user
    if (!recentMessage || recentMessage.role !== "user") {
      if (recentMessage) {
        messages.push(recentMessage);
      }
      return params;
    }

    //clean the last user message content
    const lastUserMessageContent = recentMessage.content
      .filter((content) => content.type === "text")
      .map((content) => content.text)
      .join("\n");

    // Classify the user prompt as whether it requires more context or not
    const { object: classification } = await generateObject({
      // fast model for classification:
      model: openai("gpt-4o-mini", { structuredOutputs: true }),
      output: "enum",
      enum: ["question", "statement", "other"],
      system: "classify the user message as a question, statement, or other",
      prompt: lastUserMessageContent,
    });

    // only use rag for questions
    if (classification !== "question") {
      messages.push(recentMessage);
      return params;
    }

    const { text: hypotheticalAnswer } = await generateText({
      model: openai("gpt-4o-mini", { structuredOutputs: true }),
      system: "Answer the users question:",
      prompt: lastUserMessageContent,
    });

    // Embed the hypothetical answer
    const { embedding: hypotheticalAnswerEmbedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: hypotheticalAnswer,
    });

    const context = await index.namespace(namespace).query<Metadata>({
      topK: 10,
      vector: hypotheticalAnswerEmbedding,
      includeData: true,
      includeMetadata: true,
    });

    const filteredContext = context.map((data) => ({
      type: "text" as const,
      text: data.metadata?._pageContentLC
        ? `
          ---------PAGE CONTENT---------
          ${data.metadata?._pageContentLC}


          --------ADDITIONAL RESOURCES----
          LINK: ${data.metadata?.source}
          TITLE OF THE PAGE : ${data.metadata?.title}      
      `
        : "",
    }));

    messages.push({
      role: "user",
      content: [
        ...recentMessage.content,
        {
          type: "text",
          text: "Here is some relevant information that you can use to answer the question:",
        },
        ...filteredContext,
      ],
    });

    return { ...params, prompt: messages };
  },
};

export const ragModel = wrapLanguageModel({
  model: openai("gpt-4o"),
  middleware: ragMiddleware,
});
