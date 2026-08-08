import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { ClaimAccess } from "@/components/commerce/ClaimAccess";
import { ParticleWaves } from "@/components/arsenal/ParticleWaves";
import { PRODUCTS } from "@/lib/commerce/catalog";

export const metadata = { title: "Compra confirmada · Arsenal" };

const ERROS: Record<string, string> = {
  supabase: "A liberação automática ainda não está configurada neste ambiente.",
  link: "O link de acesso veio incompleto. Peça um novo abaixo.",
  expirado: "Esse link já foi usado ou expirou. Peça um novo abaixo.",
};

export default async function ObrigadoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const product = PRODUCTS[0];

  const first = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  // A Hotmart pode devolver o comprador na URL de retorno; se vier, adianta.
  const email = first("email") ?? first("buyer_email") ?? "";
  const erro = first("erro");

  return (
    <div className="relative isolate min-h-dvh overflow-hidden">
      <ParticleWaves density={30} />

      <div className="mx-auto w-full max-w-2xl px-6 pt-20 pb-24 md:px-10">
        <header className="animate-rise mb-9 text-center">
          <span className="mb-5 inline-grid size-14 place-items-center rounded-full border border-hairline-strong bg-gold/[0.08]">
            <CheckCircle2 size={24} className="text-gold" aria-hidden />
          </span>
          <p className="text-meta mb-3">Compra confirmada</p>
          <h1 className="text-display text-3xl text-ink md:text-4xl">Bem-vindo ao {product.name}</h1>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-muted">
            Falta um passo: confirmar que a compra é sua. Use o mesmo e-mail que você informou no
            checkout da Hotmart.
          </p>
        </header>

        {erro ? (
          <div className="animate-rise mb-6 flex items-start gap-3 rounded-xl border border-amber-burnt/40 bg-amber-burnt/[0.07] p-4">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-burnt" aria-hidden />
            <p className="text-sm text-ink/90">{ERROS[erro] ?? "Algo deu errado no acesso."}</p>
          </div>
        ) : null}

        <section className="panel animate-rise p-6 md:p-8">
          <ClaimAccess defaultEmail={email} />
        </section>

        <div className="mt-8 space-y-3 text-center text-xs leading-relaxed text-muted">
          <p>
            O pagamento pode levar alguns minutos para ser confirmado pela Hotmart — boleto e Pix
            demoram mais que cartão. Se o acesso não abrir, peça o link de novo daqui a pouco.
          </p>
          <p>
            Já liberou?{" "}
            <Link href="/curso" className="text-gold-soft underline underline-offset-4">
              Ir para o curso
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
