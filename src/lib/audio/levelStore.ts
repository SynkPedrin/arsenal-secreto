/**
 * Canal de amplitude entre a captura de áudio e o canvas.
 *
 * O nível muda a 60fps. Passá-lo como prop de React causaria 60 renders por
 * segundo na árvore inteira do chat — então o valor vive aqui e a esfera lê
 * direto dentro do próprio requestAnimationFrame. Zero re-render.
 */
export type LevelSource = {
  get(): number;
  set(value: number): void;
  /** Barras de frequência para a waveform, 0–255. */
  bands(): Bands;
  setBands(data: Bands): void;
  subscribe(listener: () => void): () => void;
};

/** O buffer pode vir de um AnalyserNode ou de um slice — daí o ArrayBufferLike. */
type Bands = Uint8Array<ArrayBufferLike>;

export function createLevelSource(): LevelSource {
  let level = 0;
  let bands: Bands = new Uint8Array(0);
  const listeners = new Set<() => void>();

  return {
    get: () => level,
    set(value) {
      level = value;
    },
    bands: () => bands,
    setBands(data) {
      bands = data;
      for (const listener of listeners) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
