import { ArrowUp, Mic, Plus } from "lucide-react";

const FIRST_NAME = "Pedro";

/**
 * Home / IA. Na F0 é a casca visual: saudação, input central e o slot da esfera.
 * A F3 liga o streaming e a F4 troca o slot pelo <ParticleSphere />.
 */
export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-20">
      <div className="animate-rise w-full max-w-2xl">
        <h1 className="text-display mb-10 text-center text-4xl md:text-5xl">
          Sua vez, <span className="text-gold">{FIRST_NAME}</span>!
        </h1>

        <div className="flex items-center gap-3 rounded-full border border-hairline bg-panel px-3 py-2.5 transition-shadow duration-300 focus-within:border-hairline-strong focus-within:shadow-glow-md">
          <button
            type="button"
            aria-label="Anexar"
            className="grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors duration-200 hover:bg-white/[0.05] hover:text-gold-soft"
          >
            <Plus size={18} strokeWidth={1.8} aria-hidden />
          </button>

          <input
            type="text"
            placeholder="Pergunte ao seu arsenal…"
            aria-label="Mensagem"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-ink placeholder:text-muted focus:outline-none"
          />

          <button
            type="button"
            aria-label="Ditar"
            className="grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors duration-200 hover:bg-white/[0.05] hover:text-gold-soft"
          >
            <Mic size={18} strokeWidth={1.8} aria-hidden />
          </button>

          <button
            type="button"
            aria-label="Enviar"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-gold/12 text-gold transition-all duration-200 hover:bg-gold/20 hover:shadow-glow-sm"
          >
            <ArrowUp size={18} strokeWidth={2.1} aria-hidden />
          </button>
        </div>
      </div>

      {/* Slot da esfera de partículas — substituído na F4. */}
      <div className="mt-16 grid size-[340px] place-items-center">
        <div className="animate-glow-breath size-52 rounded-full border border-hairline bg-[radial-gradient(circle_at_50%_45%,rgba(245,179,1,0.14),transparent_68%)]" />
      </div>

      <p className="text-meta mt-6">Esfera de partículas · F4</p>
    </div>
  );
}
