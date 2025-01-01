import { ChatSchema } from "@/routes/chat.route";
import {
  genNextPrompt,
  nafsaPrompt,
  oleMissPrompt,
  toolUsage,
  udelPrompt,
} from "./constants";

export function getPrompt(university: ChatSchema["university"]) {
  switch (university) {
    case "udel":
      return udelPrompt + toolUsage;
    case "olemiss":
      return oleMissPrompt + toolUsage;
    case "nafsa":
      return nafsaPrompt + toolUsage;
    case "gennexteducation":
      return genNextPrompt + toolUsage;
    default:
      return "You are a helpful assistant that can answer questions, whenever user ask about the university, you could use the getInformation tool to get the information from the vector database";
  }
}
