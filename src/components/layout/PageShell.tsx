import type { ReactNode } from "react";

/** Cabeçalho e respiro padrão das telas internas (tudo menos a Home). */
export function PageShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 pt-16 pb-24 md:px-10">
      <header className="animate-rise mb-10">
        <p className="text-meta mb-3">{eyebrow}</p>
        <h1 className="text-display text-3xl text-ink md:text-4xl">{title}</h1>
        {description ? <p className="mt-3 max-w-2xl text-sm text-muted">{description}</p> : null}
      </header>
      {children}
    </div>
  );
}

/** Marcador honesto de fase futura — some conforme F1–F6 entregam. */
export function PhaseStub({ phase, items }: { phase: string; items: readonly string[] }) {
  return (
    <div className="panel p-8">
      <p className="text-meta mb-4">Aguardando {phase}</p>
      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-3 text-sm text-muted">
            <span aria-hidden className="mt-1.5 size-1 shrink-0 rounded-full bg-gold-deep" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
