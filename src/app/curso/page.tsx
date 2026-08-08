import Link from "next/link";
import { CircleDashed, Lock, PlayCircle, ShieldCheck } from "lucide-react";
import { ClaimAccess } from "@/components/commerce/ClaimAccess";
import { getAccess } from "@/lib/commerce/access";
import { PRODUCTS } from "@/lib/commerce/catalog";

export const metadata = { title: "Curso · Arsenal" };
export const dynamic = "force-dynamic";

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-3xl px-6 pt-16 pb-24 md:px-10">{children}</div>;
}

/** Porta fechada. Um único componente para todos os motivos de bloqueio. */
function Gate({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  const product = PRODUCTS[0];

  return (
    <Shell>
      <div className="panel animate-rise p-8 md:p-10">
        <span className="mb-6 inline-grid size-12 place-items-center rounded-full border border-hairline bg-void">
          <Lock size={20} className="text-gold-deep" aria-hidden />
        </span>

        <h1 className="text-display text-2xl text-ink md:text-3xl">{title}</h1>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted">{description}</p>

        <div className="mt-8">{children}</div>

        <div className="mt-9 border-t border-hairline pt-6">
          <p className="text-xs leading-relaxed text-muted">
            Ainda não comprou?{" "}
            <a
              href={product.salesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold-soft underline underline-offset-4"
            >
              Conheça o {product.name}
            </a>
            .
          </p>
        </div>
      </div>
    </Shell>
  );
}

export default async function CursoPage() {
  const product = PRODUCTS[0];
  const access = await getAccess(product.slug);

  if (access.kind === "unconfigured") {
    return (
      <Gate
        title="Acesso ainda não configurado"
        description="A liberação depende do Supabase, que ainda não tem chaves neste ambiente. Nenhum acesso é concedido enquanto isso — não existe modo de demonstração aqui, por segurança."
      >
        <div className="rounded-xl border border-hairline bg-void/60 p-4 font-mono text-xs leading-relaxed text-muted">
          1. Preencher NEXT_PUBLIC_SUPABASE_URL, ANON_KEY e SERVICE_ROLE_KEY
          <br />
          2. Aplicar supabase/migrations/0003_hotmart.sql
          <br />
          3. Configurar HOTMART_HOTTOK e o webhook na Hotmart
        </div>
      </Gate>
    );
  }

  if (access.kind === "anonymous") {
    return (
      <Gate
        title="Entre para acessar"
        description="Se você já comprou na Hotmart, use o mesmo e-mail do checkout. Enviamos um link e o acesso abre sozinho."
      >
        <ClaimAccess />
      </Gate>
    );
  }

  if (access.kind === "no-purchase") {
    return (
      <Gate
        title="Não encontramos sua compra"
        description={`Você entrou como ${access.email}, mas não há compra aprovada nesse e-mail. Se você comprou com outro endereço, peça o link por ele. Compras no Pix ou boleto levam alguns minutos para a Hotmart confirmar.`}
      >
        <ClaimAccess />
      </Gate>
    );
  }

  const launched = product.status === "live";

  return (
    <Shell>
      <header className="animate-rise mb-9">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck size={14} className="text-gold" aria-hidden />
          <span className="text-meta text-gold-soft">Acesso liberado</span>
        </div>

        <p className="text-meta mb-3">{product.tagline}</p>
        <h1 className="text-display text-3xl text-ink md:text-4xl">{product.name}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{product.description}</p>
      </header>

      {!launched ? (
        <div className="panel animate-rise mb-6 flex items-start gap-3 p-5">
          <CircleDashed size={18} className="mt-0.5 shrink-0 text-gold-soft" aria-hidden />
          <div>
            <p className="text-sm text-ink">O conteúdo ainda está sendo gravado.</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">
              Sua compra já está registrada e o acesso é permanente — as aulas abrem aqui assim que
              o produto for lançado. Enquanto isso, o{" "}
              <Link href="/treinamento" className="text-gold-soft underline underline-offset-4">
                modo treinamento
              </Link>{" "}
              já está de pé.
            </p>
          </div>
        </div>
      ) : null}

      <div className="animate-rise space-y-4">
        {product.modules.map((module, index) => (
          <section key={module.title} className="panel p-5 md:p-6">
            <div className="mb-4 flex items-baseline gap-3">
              <span className="font-mono text-xs text-gold-deep">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h2 className="text-display text-base text-ink">{module.title}</h2>
                {module.summary ? (
                  <p className="mt-1 text-xs text-muted">{module.summary}</p>
                ) : null}
              </div>
            </div>

            <ul className="space-y-1">
              {module.lessons.map((lesson) => (
                <li
                  key={lesson.title}
                  className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm text-muted"
                >
                  <PlayCircle
                    size={16}
                    strokeWidth={1.7}
                    className={launched ? "text-gold-soft" : "text-gold-deep/60"}
                    aria-hidden
                  />
                  <span className={launched ? "text-ink/85" : ""}>{lesson.title}</span>
                  {!launched ? (
                    <span className="text-meta ml-auto">em breve</span>
                  ) : lesson.duration ? (
                    <span className="ml-auto font-mono text-[11px]">{lesson.duration}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Shell>
  );
}
