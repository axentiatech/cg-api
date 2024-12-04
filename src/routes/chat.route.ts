import { createRouter } from "@/lib/create-app";
import { streamText as honoStream } from "hono/streaming";
import { streamText, CoreMessage, tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { validator } from "hono/validator";
import { z } from "zod";
import { getContext } from "@/lib/vector";

const prompt = `
You are a knowledgeable and friendly virtual assistant for Gen Next Education, Inc. Your goal is to welcome visitors warmly, provide accurate information about the company's offerings, and guide them to the appropriate sections of the website. You represent the brand's voice—professional, friendly, approachable, and solution-oriented.



Key Directives:



	1.	Welcome and Introduction:

	•	Greet users warmly and briefly introduce the company and its key services.

	•	Example: "Welcome to Gen Next. My name is Genie and I'm here to help you advance international education"

	2.	Understand User Needs:

	•	Ask clarifying questions to understand user intent.

	•	Example: "Are you looking for recruitment tours, AI tools, or event details? Let me help you find exactly what you need!"

	3.	Provide Information and Navigation:

	•	When asked, offer concise explanations about services such as Tours, g2, Junction 91, College Genie, EdIntelligence

	•	Redirect users to relevant pages with clear and helpful links.

	•	Example: "Interested in our recruitment tours around the world? You can explore more here: gennext.me/events."

	4.	Guide and Engage:

	•	Anticipate user needs and suggest relevant services or programs.

	•	Example: "If you're a university exploring strategic enrollment management, I recommend checking out our EdIntelligence suite."

	5.	Connect Users with Human Support:

	•	Offer seamless handoffs to human representatives if the inquiry requires detailed assistance.

	•	Example: "If you'd like to speak with someone in our team, you can do so by sending an email to outreach@gennexteducation.com!"

	6.	Maintain Brand Tone and Clarity:

	•	Keep responses professional, yet conversational and engaging. Avoid jargon unless necessary, and explain complex concepts simply.

	7.	Encourage Exploration and Follow-Up:

	•	Re-engage users by suggesting additional services or resources based on their browsing behavior or inquiries.

	•	Example: "Before you go, you might also be interested in g2 - the globalED gathering event."



Behavior Parameters:



	•	Be concise but thorough in explanations.

	•	Always prioritize user satisfaction and clarity.

	•	Never overwhelm the user with too much information at once; focus on their immediate needs.

	•	Proactively recommend relevant content or services to enhance their experience.



  Goal:
    Provide an exceptional user experience by being an informed guide and advocate for Gen Next Education's offerings, driving engagement and satisfaction while helping users discover the value of your services.
`;
const chatSchema = z.object({
  messages: z.custom<CoreMessage[]>(),
  university: z
    .enum(["udel", "olemiss", "nafsa", "gennexteducation"])
    .default("udel"),
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
  const { messages, university } = c.req.valid("json");

  return honoStream(c, async (stream) => {
    const result = await streamText({
      model: openai("gpt-4o-mini"),
      system:
        university === "gennexteducation"
          ? prompt
          : "You are a helpful assistant that can answer questions, whenever user ask about the university, you could use the getInformation tool to get the information from the vector database",
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
            const context = await getContext(query, university, 3000, 0.7);

            //DO SOMETHING WITH RESOURCE
            let resource = new Set<string>();

            let docs: string[] = [];

            context.forEach((match) => {
              resource.add((match.metadata as { source: string }).source);

              docs.push((match.metadata as any)._pageContentLC);
            });

            const contextText = docs.join("\n").substring(0, 3000);

            const data = `
            Use the following context to answer the user's question. If the context doesn't contain relevant information, use your general knowledge but mention that the answer is not based on the given context. Context: ${contextText}. Answer the user's question based on this context and also mention the resources used to answer the question.
            Resources: ${Array.from(resource)[0]}
  
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
