/** Traduz as falhas mais comuns da OpenAI em algo acionável. */
export function humanizeError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);

  if (/no credits remaining|insufficient_quota|exceeded your current quota/i.test(raw)) {
    return "A conta da OpenAI está sem créditos. Adicione saldo em platform.openai.com/settings/organization/billing e tente de novo.";
  }
  if (/invalid[_ ]api[_ ]key|Incorrect API key/i.test(raw)) {
    return "A OPENAI_API_KEY é inválida ou foi revogada. Gere uma nova e atualize o .env.local.";
  }
  if (/rate limit/i.test(raw)) {
    return "Limite de requisições da OpenAI atingido. Aguarde alguns segundos.";
  }
  if (/model .* does not exist|do not have access to/i.test(raw)) {
    return "A chave não tem acesso a este modelo. Ajuste ARSENAL_MODEL em src/lib/ai/config.ts.";
  }
  return raw;
}
