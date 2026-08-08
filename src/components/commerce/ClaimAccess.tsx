"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Mail } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

type Phase = "idle" | "sending" | "sent" | "error";

/**
 * Liberação de acesso pós-compra.
 *
 * O e-mail digitado aqui não libera nada: ele apenas dispara um magic link.
 * Quem prova a titularidade da compra é o clique no link recebido naquele
 * e-mail — é o Supabase que verifica, e só então as compras viram acesso.
 */
export function ClaimAccess({ defaultEmail = "" }: { defaultEmail?: string }) {
  const [email, setEmail] = useState(defaultEmail);
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("");

  if (!isSupabaseConfigured) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber-burnt/40 bg-amber-burnt/[0.07] p-4">
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-burnt" aria-hidden />
        <div className="text-sm text-ink/90">
          <p>A liberação de acesso ainda não está ligada.</p>
          <p className="mt-1 text-xs text-muted">
            Falta preencher as chaves do Supabase em <code className="text-gold-soft">.env.local</code>{" "}
            e aplicar a migration <code className="text-gold-soft">0003_hotmart.sql</code>.
          </p>
        </div>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const address = email.trim().toLowerCase();
    if (!address) return;

    setPhase("sending");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: address,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/curso` },
      });

      if (error) {
        setPhase("error");
        setMessage(error.message);
        return;
      }
      setPhase("sent");
    } catch {
      setPhase("error");
      setMessage("Não consegui enviar o link. Tente de novo em instantes.");
    }
  };

  if (phase === "sent") {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-hairline-strong bg-gold/[0.06] p-5">
        <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-gold" aria-hidden />
        <div>
          <p className="text-sm text-ink">Link enviado para {email}.</p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">
            Abra o e-mail e clique no link para liberar o acesso. Se não chegou em 2 minutos,
            confira o spam — e confirme que é o mesmo e-mail usado na compra.
          </p>
          <button
            type="button"
            onClick={() => setPhase("idle")}
            className="mt-3 text-xs text-gold-soft underline underline-offset-4"
          >
            Usar outro e-mail
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label htmlFor="email" className="text-meta block">
        E-mail usado na compra
      </label>

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <div className="flex flex-1 items-center gap-2.5 rounded-xl border border-hairline bg-void px-4 focus-within:border-hairline-strong">
          <Mail size={16} className="shrink-0 text-muted" aria-hidden />
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@email.com"
            className="min-w-0 flex-1 bg-transparent py-3 text-sm text-ink placeholder:text-muted focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={phase === "sending"}
          className="text-display flex items-center justify-center gap-2 rounded-xl bg-gold/12 px-6 py-3 text-xs tracking-[0.14em] text-gold uppercase transition-all duration-200 enabled:hover:bg-gold/20 enabled:hover:shadow-glow-sm disabled:opacity-40"
        >
          {phase === "sending" ? <Loader2 size={14} className="animate-spin" aria-hidden /> : null}
          Liberar acesso
        </button>
      </div>

      <p className="text-xs leading-relaxed text-muted">
        Enviamos um link de acesso para esse endereço. Ele precisa ser exatamente o e-mail da
        compra na Hotmart — é assim que confirmamos que a compra é sua.
      </p>

      {phase === "error" ? <p className="text-xs text-amber-burnt">{message}</p> : null}
    </form>
  );
}
