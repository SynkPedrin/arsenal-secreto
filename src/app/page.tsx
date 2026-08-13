import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Brain, Mic, Target } from "lucide-react";
import { HeroPlayer } from "@/components/lp/HeroPlayer";
import { RotatingWord } from "@/components/lp/RotatingWord";

export const metadata = {
  title: "Closer's IA — treine a call antes de vivê-la",
  description:
    "A IA treinada no método de David William. Ela vira o seu lead, te pressiona com objeção real e disseca onde a venda foi perdida.",
  alternates: { canonical: "/" },
};

/** O que o closer treina aqui — gira dentro do título. */
const TREINOS = ["a objeção", "o silêncio", "a pressão", "o não", "o fechamento"] as const;

const NAV = [
  { label: "Método", href: "#metodo" },
  { label: "Treino", href: "#treino" },
  { label: "Cérebro", href: "#cerebro" },
] as const;

const PILARES = [
  {
    icon: Target,
    title: "Sparring com lead real",
    body: "A IA encarna o cliente difícil e não facilita. Ela enrola, testa, some — e só avança se você conduzir. As objeções vêm do acervo, não da imaginação dela.",
  },
  {
    icon: Brain,
    title: "Cérebro auditável",
    body: "Cada resposta cita a nota que a fundamentou. Quando o método não cobre o tema, ela diz isso em vez de inventar — é a regra que sustenta a confiança.",
  },
  {
    icon: Mic,
    title: "Treino por voz",
    body: "Fale como você falaria na call. A transcrição entra no chat e a esfera reage à sua voz em tempo real, porque call é falada, não digitada.",
  },
] as const;

/** Rótulo em mono, o mesmo tom técnico do app. */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-meta mb-4">{children}</p>;
}

export default function LandingPage() {
  return (
    <div className="relative isolate min-h-dvh overflow-x-hidden bg-void">
      {/* ── Navbar flutuante ─────────────────────────────────── */}
      <header className="fixed inset-x-0 top-4 z-50 px-4">
        <nav className="mx-auto flex max-w-5xl items-center gap-6 rounded-2xl border border-hairline bg-[oklch(14%_0.005_60_/_0.72)] px-4 py-2.5 shadow-[inset_0_1px_0_0_oklch(100%_0_0_/_0.05)] backdrop-blur-xl">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <Image src="/logo-dw.png" alt="" width={30} height={30} className="size-[30px]" />
            <span className="text-display text-sm text-ink">Closer&apos;s IA</span>
          </Link>

          <div className="hidden flex-1 items-center gap-6 md:flex">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm text-muted transition-colors duration-200 hover:text-ink"
              >
                {item.label}
              </a>
            ))}
          </div>

          <Link
            href="/ia"
            className="ml-auto shrink-0 rounded-xl bg-gold-soft px-4 py-2 text-sm font-medium text-void transition-opacity duration-200 hover:opacity-88"
          >
            Abrir o Arsenal
          </Link>
        </nav>
      </header>

      {/* ── Herói ────────────────────────────────────────────── */}
      <section className="relative px-6 pt-40 pb-8 text-center md:pt-48">
        <a
          href="#treino"
          className="animate-rise mb-10 inline-flex items-center gap-2.5 rounded-full border border-hairline bg-panel/60 py-1.5 pr-3 pl-1.5 backdrop-blur-md transition-colors duration-200 hover:border-hairline-strong"
        >
          <span className="rounded-full bg-gold/12 px-2.5 py-0.5 font-mono text-[10px] tracking-wider text-gold uppercase">
            Novo
          </span>
          <span className="text-xs text-muted">Modo sparring com nível Inferno</span>
          <ArrowRight size={13} className="text-muted" aria-hidden />
        </a>

        <h1 className="text-display animate-rise mx-auto max-w-4xl text-[clamp(2.5rem,7vw,5rem)] leading-[1.02] tracking-[-0.04em] text-ink">
          {/* A frase inteira, uma vez, para leitor de tela e para busca. */}
          <span className="sr-only">
            Treine a objeção, o silêncio, a pressão, o não e o fechamento antes da call.
          </span>

          <span aria-hidden className="block">
            Treine <RotatingWord words={TREINOS} />
            <br />
            antes da call.
          </span>
        </h1>

        <p className="animate-rise mx-auto mt-7 max-w-lg text-[17px] leading-relaxed text-muted">
          A IA treinada no método de David William. Ela vira o seu lead, te pressiona com
          objeção real e disseca onde a venda foi perdida.
        </p>

        <div className="animate-rise mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/treinamento"
            className="w-full rounded-xl bg-gold-soft px-6 py-3 text-sm font-medium text-void transition-opacity duration-200 hover:opacity-88 sm:w-auto"
          >
            Começar um sparring
          </Link>
          <Link
            href="/ia"
            className="w-full rounded-xl border border-hairline bg-panel/60 px-6 py-3 text-sm text-ink transition-colors duration-200 hover:border-hairline-strong sm:w-auto"
          >
            Conversar com a IA
          </Link>
        </div>

        <p className="text-meta mt-6">
          8 calls reais · 74 a 152 min cada · método destilado, não inventado
        </p>
      </section>

      {/* ── A composição Remotion ────────────────────────────── */}
      <section className="relative mx-auto -mt-4 max-w-6xl px-6">
        <div className="overflow-hidden rounded-3xl border border-hairline">
          <HeroPlayer />
        </div>
      </section>

      {/* ── Pilares ──────────────────────────────────────────── */}
      <section id="treino" className="mx-auto max-w-6xl px-6 py-28">
        <div className="mb-14 max-w-2xl">
          <Eyebrow>O que ela faz</Eyebrow>
          <h2 className="text-display text-[clamp(1.85rem,4vw,2.75rem)] leading-[1.05] tracking-[-0.03em] text-ink">
            Não é um chat que sabe vender.
            <br />É um closer que te testa.
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {PILARES.map((pilar) => (
            <article key={pilar.title} className="panel p-6">
              <span className="mb-5 grid size-10 place-items-center rounded-xl border border-hairline bg-void">
                <pilar.icon size={17} strokeWidth={1.7} className="text-gold-soft" aria-hidden />
              </span>
              <h3 className="text-display mb-2.5 text-base text-ink">{pilar.title}</h3>
              <p className="text-sm leading-relaxed text-muted">{pilar.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Método ───────────────────────────────────────────── */}
      <section id="metodo" className="mx-auto max-w-6xl px-6 pb-28">
        <div className="panel overflow-hidden p-8 md:p-12">
          <Eyebrow>O método</Eyebrow>
          <h2 className="text-display max-w-2xl text-[clamp(1.6rem,3.4vw,2.35rem)] leading-[1.1] tracking-[-0.03em] text-ink">
            Ele pede autorização para vender no primeiro minuto — e o lead concorda.
          </h2>

          <blockquote className="mt-8 max-w-2xl border-l-2 border-gold-deep pl-5 text-[15px] leading-relaxed text-ink/85 italic">
            “Essa reunião tem apenas três etapas. A primeira é o diagnóstico. A segunda é eu
            te apresentar uma solução. Se ambos identificarmos que faz sentido, a gente
            avança pra terceira. Senão a gente mantém a amizade e vida que segue. Pode ser
            assim?”
          </blockquote>
          <p className="text-meta mt-3 pl-5">David William · abertura padrão das 8 calls</p>

          <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-hairline bg-[var(--border-subtle)] sm:grid-cols-3">
            {[
              ["3", "etapas anunciadas antes de começar"],
              ["7", "fontes de aquisição na apresentação"],
              ["100%", "devolução em contrato, se não retornar"],
            ].map(([valor, texto]) => (
              <div key={texto} className="bg-panel p-6">
                <p className="text-display text-3xl text-gold-soft">{valor}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted">{texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cérebro ──────────────────────────────────────────── */}
      <section id="cerebro" className="mx-auto max-w-6xl px-6 pb-28">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <Eyebrow>O cérebro</Eyebrow>
            <h2 className="text-display text-[clamp(1.6rem,3.4vw,2.35rem)] leading-[1.1] tracking-[-0.03em] text-ink">
              Se não está no método, ela diz que não está.
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-muted">
              O conhecimento vive num vault do Obsidian, versionado junto com o código. A
              cada pergunta a IA busca ali e cita a nota que sustentou a resposta. Nota
              marcada como rascunho <strong className="text-gold-soft">nunca</strong> é
              recuperada — a regra anti-alucinação existe na camada do dado, não só no
              prompt.
            </p>

            <Link
              href="/analytics"
              className="mt-7 inline-flex items-center gap-2 text-sm text-gold-soft transition-colors duration-200 hover:text-ink"
            >
              Ver o cérebro em tempo real
              <ArrowRight size={14} aria-hidden />
            </Link>
          </div>

          <div className="panel p-5 font-mono text-xs">
            <p className="text-meta mb-4">busca no cérebro</p>
            {[
              ["1.00", "Playbook de Objeções", "“Tá caro”"],
              ["0.54", "Playbook de Objeções", "Matriz rápida"],
              ["0.45", "Persona e Voz", "Bordões verbatim"],
            ].map(([score, nota, secao]) => (
              <div
                key={secao}
                className="flex items-baseline gap-3 border-t border-hairline py-2.5 first:border-t-0"
              >
                <span className="shrink-0 text-gold-soft">{score}</span>
                <span className="min-w-0 flex-1 truncate text-ink/80">{nota}</span>
                <span className="shrink-0 text-muted">{secao}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Fechamento ───────────────────────────────────────── */}
      <section className="relative px-6 pb-32 text-center">
        <h2 className="text-display mx-auto max-w-2xl text-[clamp(1.85rem,4.5vw,3rem)] leading-[1.05] tracking-[-0.035em] text-ink">
          A próxima objeção você já ouviu.
        </h2>
        <p className="mx-auto mt-5 max-w-md text-sm text-muted">
          Aqui, antes de custar a venda.
        </p>

        <Link
          href="/treinamento"
          className="mt-9 inline-block rounded-xl bg-gold-soft px-7 py-3.5 text-sm font-medium text-void transition-opacity duration-200 hover:opacity-88"
        >
          Entrar no sparring
        </Link>
      </section>

      <footer className="border-t border-hairline px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <Image src="/logo-dw.png" alt="" width={22} height={22} className="size-[22px]" />
            <span className="text-meta">Closer&apos;s IA · método David William</span>
          </div>
          <Link href="/arsenal-secreto" className="text-meta transition-colors hover:text-gold-soft">
            Arsenal Secreto
          </Link>
        </div>
      </footer>
    </div>
  );
}
