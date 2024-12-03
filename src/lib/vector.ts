import { embed, generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { Index, QueryResult } from "@upstash/vector";
import env from "@/env";

type Dict = Record<string, unknown>;

const index = new Index({
  url: env.UPSTASH_VECTOR_URL,
  token: env.UPSTASH_VECTOR_TOKEN,
});

export async function getEmbeddings(message: string) {
  try {
    // Use hypothetical document embeddings:
    const { text: hypotheticalAnswer } = await generateText({
      // fast model for generating hypothetical answer:
      model: openai("gpt-4o-mini", { structuredOutputs: true }),
      system: "Answer the users question:",
      prompt: message,
    });

    const { embedding } = await embed({
      model: openai.embedding("text-embedding-ada-002"),
      value: hypotheticalAnswer,
    });

    return embedding as number[];
  } catch (e) {
    console.log("Error calling OpenAI embedding API: ", e);
    throw new Error(`Error calling OpenAI embedding API: ${e}`);
  }
}

export async function getMatchesFromEmbeddings(
  embeddings: number[],
  topK: number,
  namespace: string
): Promise<QueryResult<Dict>[]> {
  try {
    const upstashNamespace = index.namespace(namespace ?? "");

    const queryResult = await upstashNamespace.query({
      vector: embeddings,
      topK,
      includeMetadata: true,
    });

    return queryResult;
  } catch (e) {
    // Log the error and throw it
    console.log("Error querying embeddings: ", e);
    throw new Error(`Error querying embeddings: ${e}`);
  }
}

export async function getContext(
  message: string,
  namespace: string,
  maxTokens: number = 3000,
  minScore = 0.7
) {
  const embedding = await getEmbeddings(message);

  const matches = await getMatchesFromEmbeddings(embedding, 10, namespace);

  return matches.filter((m) => m.score && m.score > minScore);
}
