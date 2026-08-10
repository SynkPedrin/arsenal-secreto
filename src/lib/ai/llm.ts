import "server-only";
import OpenAI from "openai";
import { groqApiKey } from "@/lib/env.server";

/** Endpoint compatível com a API da OpenAI — por isso o SDK continua o mesmo. */
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

let client: OpenAI | null = null;

/** Instância única, criada só no primeiro uso real. */
export function llm(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: groqApiKey(), baseURL: GROQ_BASE_URL });
  }
  return client;
}
