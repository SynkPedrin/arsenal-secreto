import "server-only";
import { z } from "zod";

/**
 * Segredos. O import de "server-only" faz o build quebrar se algum
 * componente de cliente puxar este módulo, direta ou indiretamente.
 *
 * A validação é granular e preguiçosa de propósito: quem só precisa da
 * Groq não deve falhar porque o Supabase ainda não foi configurado.
 */
function required(name: string, value: string | undefined): string {
  const parsed = z.string().min(1).safeParse(value);
  if (!parsed.success) {
    throw new Error(
      `Variável de ambiente ausente: ${name}. Preencha .env.local a partir de .env.example.`,
    );
  }
  return parsed.data;
}

/** Motor de inferência: chat e transcrição. */
export function groqApiKey(): string {
  return required("GROQ_API_KEY", process.env.GROQ_API_KEY);
}

export function supabaseServiceRoleKey(): string {
  return required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function arsenalSecretoUrl(): string {
  return process.env.ARSENAL_SECRETO_URL ?? "https://arsenalsecreto.lovable.app/";
}
