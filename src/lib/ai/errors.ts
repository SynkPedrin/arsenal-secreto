/** Traduz as falhas mais comuns da Groq em algo acionável. */
export function humanizeError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);

  if (/invalid[_ ]api[_ ]key|Invalid API Key|401/i.test(raw)) {
    return "A GROQ_API_KEY é inválida ou foi revogada. Gere uma nova em console.groq.com e atualize o .env.local.";
  }
  if (/rate[_ ]limit|429|too many requests/i.test(raw)) {
    return "Limite de requisições da Groq atingido. Aguarde alguns segundos e tente de novo.";
  }
  if (/quota|insufficient|billing|no credits/i.test(raw)) {
    return "A conta da Groq atingiu o limite do plano. Confira o uso em console.groq.com.";
  }
  if (/model .* does not exist|model_not_found|decommissioned/i.test(raw)) {
    return "O modelo configurado não existe mais na Groq. Ajuste ARSENAL_MODEL em src/lib/ai/config.ts.";
  }
  if (/context[_ ]length|too large|maximum context/i.test(raw)) {
    return "A conversa ficou longa demais para o modelo. Comece uma nova conversa.";
  }
  if (/ECONNREFUSED|ENOTFOUND|fetch failed|network/i.test(raw)) {
    return "Não consegui falar com a Groq. Verifique a conexão.";
  }
  return raw;
}
