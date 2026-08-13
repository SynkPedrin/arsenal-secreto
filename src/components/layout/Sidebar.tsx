"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/**
 * Navegação primária. Barra estreita à esquerda no desktop,
 * barra inferior no mobile — mesma fonte de verdade (NAV_ITEMS).
 */
export function Sidebar({ initials }: { initials: string }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-around border-t border-hairline bg-panel/95 backdrop-blur-md md:inset-y-0 md:right-auto md:left-0 md:h-auto md:w-[var(--rail-w)] md:flex-col md:justify-start md:gap-1.5 md:border-t-0 md:border-r md:bg-[oklch(10%_0.004_60_/_0.9)] md:py-6"
    >
      {/* Filete vertical que some nas pontas — remata a barra sem pesar. */}
      <span
        aria-hidden
        className="absolute top-0 right-0 hidden h-full w-px bg-gradient-to-b from-transparent via-[oklch(78%_0.13_80_/_0.16)] to-transparent md:block"
      />

      <Link
        href="/"
        aria-label="Arsenal — início"
        className="group/logo mb-6 hidden shrink-0 md:block"
      >
        {/* Só o monograma: sem anel na arte, sem halo atrás. */}
        <Image
          src="/logo-dw.png"
          alt="David William"
          width={72}
          height={72}
          priority
          className="size-[72px] transition-transform duration-500 ease-out group-hover/logo:scale-[1.05]"
        />
      </Link>

      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            title={item.hint}
            className={`group relative grid size-11 place-items-center rounded-xl transition-all duration-200 ${
              active
                ? "bg-gold/10 text-gold shadow-glow-sm"
                : "text-muted hover:bg-white/[0.04] hover:text-gold-soft"
            }`}
          >
            <Icon size={19} strokeWidth={active ? 2.1 : 1.7} aria-hidden />
            <span className="sr-only">{item.label}</span>

            {active ? (
              <span
                aria-hidden
                className="absolute -left-[22px] hidden h-5 w-[2px] rounded-full bg-gold shadow-glow-sm md:block"
              />
            ) : null}

            <span
              aria-hidden
              className="pointer-events-none absolute left-[62px] z-40 hidden whitespace-nowrap rounded-lg border border-hairline bg-elevated px-2.5 py-1.5 text-xs text-ink opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100 md:block"
            >
              {item.label}
            </span>
          </Link>
        );
      })}

      <div
        className="ml-2 hidden size-9 place-items-center rounded-full border border-hairline-strong bg-elevated font-mono text-[11px] tracking-wider text-gold-soft md:mt-auto md:ml-0 md:grid"
        title="Sessão"
      >
        {initials}
      </div>
    </nav>
  );
}
