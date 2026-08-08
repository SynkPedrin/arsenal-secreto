export const CLIENT_PROFILES = [
  { id: "cetico", label: "Cético", icon: "🤨", blurb: "Desconfia de tudo, responde seco" },
  { id: "comparador", label: "Comparador", icon: "⚖️", blurb: "Tem concorrente na mão" },
  { id: "pressiona-preco", label: "Pressiona preço", icon: "💰", blurb: "Volta no preço sempre" },
  { id: "esfriou", label: "Esfriou e sumiu", icon: "🧊", blurb: "Estava quente, agora some" },
  { id: "apressado", label: "Decisor apressado", icon: "⏱️", blurb: "Sem tempo, quer o número" },
  { id: "aleatorio", label: "Aleatório", icon: "🎲", blurb: "A IA escolhe — como no campo" },
] as const;

export type ClientProfileId = (typeof CLIENT_PROFILES)[number]["id"];
export type Difficulty = "campo" | "inferno";

export type TrainingSetup = {
  objective: string;
  product: string;
  ticket: number | null;
  clientProfile: ClientProfileId;
  difficulty: Difficulty;
};

export type Debrief = {
  result: "fechou" | "perdeu" | "encerrou";
  score: number;
  hits: { quote: string; why: string }[];
  turning_points: { quote: string; effect: string }[];
  missing_play: string;
  next_training: string;
};

export type TrainingRecord = {
  id: string;
  finishedAt: string;
  setup: TrainingSetup;
  debrief: Debrief;
};

export function profileLabel(id: ClientProfileId): string {
  return CLIENT_PROFILES.find((p) => p.id === id)?.label ?? id;
}
