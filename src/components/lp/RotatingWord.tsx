"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";

/**
 * A palavra que gira dentro do título.
 *
 * O detalhe que faz ou quebra este efeito é a largura. Fixar na maior palavra
 * abre um vão enorme depois de "Treine"; deixar solta faz o título pular a
 * cada troca. A saída é medir cada palavra uma vez e animar a largura do
 * contêiner até a da palavra ativa — o título "respira" junto com a troca.
 *
 * As palavras ficam todas empilhadas na mesma célula de grid, então a medição
 * não precisa de nó fantasma e a altura já sai correta.
 */
const INTERVALO_MS = 2400;

export function RotatingWord({
  words,
  className = "",
}: {
  words: readonly string[];
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const [widths, setWidths] = useState<number[]>([]);
  const refs = useRef<(HTMLSpanElement | null)[]>([]);
  const reduzido = useReducedMotion();

  // Mede antes da pintura, para a primeira largura já sair certa.
  useLayoutEffect(() => {
    const medir = () =>
      setWidths(refs.current.map((el) => (el ? Math.ceil(el.getBoundingClientRect().width) : 0)));

    medir();

    // A fonte serif chega depois do primeiro render; sem isto a medida fica
    // com a métrica da fonte de fallback.
    void document.fonts?.ready.then(medir);

    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [words]);

  useEffect(() => {
    if (reduzido) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % words.length), INTERVALO_MS);
    return () => clearInterval(id);
  }, [words.length, reduzido]);

  const largura = widths[index];

  return (
    <span
      className={`relative inline-grid overflow-hidden align-baseline ${className}`}
      style={{
        width: largura ? `${largura}px` : "auto",
        transition: reduzido
          ? undefined
          : "width 520ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {words.map((word, i) => {
        const ativo = i === index;

        return (
          <span
            key={word}
            ref={(el) => {
              refs.current[i] = el;
            }}
            aria-hidden={!ativo}
            className="col-start-1 row-start-1 justify-self-start whitespace-nowrap italic"
            style={{
              fontFamily: "var(--font-serif), ui-serif, Georgia, serif",
              letterSpacing: "-0.01em",
              color: "var(--gold-soft)",
              opacity: ativo ? 1 : 0,
              translate: reduzido ? "0 0" : ativo ? "0 0" : "0 0.4em",
              filter: ativo ? "blur(0px)" : "blur(5px)",
              transition: reduzido
                ? undefined
                : "opacity 440ms cubic-bezier(0.16,1,0.3,1), translate 440ms cubic-bezier(0.16,1,0.3,1), filter 440ms cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            {word}
          </span>
        );
      })}
    </span>
  );
}
