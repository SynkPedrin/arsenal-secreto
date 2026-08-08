import "server-only";
import OpenAI from "openai";
import { openaiApiKey } from "@/lib/env.server";

let client: OpenAI | null = null;

/** Instância única, criada só no primeiro uso real. */
export function openai(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: openaiApiKey() });
  }
  return client;
}
