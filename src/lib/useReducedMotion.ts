"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

const client = () => window.matchMedia(QUERY).matches;
/** No servidor assumimos movimento; o cliente corrige na hidratação. */
const server = () => false;

/**
 * Preferência de movimento reduzido, como fonte externa.
 *
 * Ler com `useState` + `useEffect` obrigaria a um setState dentro do efeito e
 * ignoraria a troca da preferência com a página aberta. Aqui o React assina a
 * media query e re-renderiza sozinho.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, client, server);
}
