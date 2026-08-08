/**
 * Web Speech API — não existe em lib.dom, então declaramos o mínimo que usamos.
 *
 * Ela roda no próprio browser: transcrição instantânea, sem custo e sem rede.
 * Aqui serve para dois papéis: mostrar ao vivo o que está sendo falado, e ser o
 * plano B quando a transcrição da OpenAI falha.
 */
type SpeechRecognitionAlternative = { transcript: string };
type SpeechRecognitionResult = { 0: SpeechRecognitionAlternative; isFinal: boolean };

export type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechRecognitionResult };
};

export type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export function createRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;

  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) return null;

  const recognition = new Ctor();
  recognition.lang = "pt-BR";
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  return recognition;
}

/** Concatena o que já é definitivo com o que ainda está sendo reconhecido. */
export function readTranscript(event: SpeechRecognitionEventLike): string {
  let text = "";
  for (let i = 0; i < event.results.length; i += 1) {
    text += event.results[i][0].transcript;
  }
  return text.trim();
}
