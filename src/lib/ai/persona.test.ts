import { describe, expect, it } from "vitest";
import type { RagSource } from "@/lib/supabase/database.types";
import { buildSystemPrompt, DEBRIEF_INSTRUCTION } from "./persona";

const fonte: RagSource = {
  chunk_id: "c1",
  note_id: "n1",
  note_title: "03 - Playbook de Objecoes - David William",
  note_path: "00-Cerebro/03.md",
  heading_path: 'Playbook > 2. "Tá caro"',
  excerpt: "Caro e barato é aquilo que me traz resultado.",
  score: 1,
};

describe("system prompt do Arsenal", () => {
  describe("garantia anti-alucinação (R7)", () => {
    it("sem fontes, proíbe citar qualquer call do acervo", () => {
      const prompt = buildSystemPrompt({ sources: [] });

      expect(prompt).toContain("BASE DE CONHECIMENTO — VAZIA");
      expect(prompt).toMatch(/não pode citar/i);
      expect(prompt).not.toContain("FONTES RECUPERADAS");
    });

    it("com fontes, manda citar e entrega o conteúdo recuperado", () => {
      const prompt = buildSystemPrompt({ sources: [fonte] });

      expect(prompt).toContain("FONTES RECUPERADAS");
      expect(prompt).toContain(fonte.excerpt);
      expect(prompt).toContain('[Fonte: 03 - Playbook de Objecoes - David William > Playbook > 2. "Tá caro"]');
      expect(prompt).not.toContain("BASE DE CONHECIMENTO — VAZIA");
    });

    it("os dois estados são mutuamente exclusivos — nunca ambos", () => {
      for (const sources of [[], [fonte]]) {
        const prompt = buildSystemPrompt({ sources });
        const vazio = prompt.includes("BASE DE CONHECIMENTO — VAZIA");
        const cheio = prompt.includes("FONTES RECUPERADAS");
        expect(vazio).not.toBe(cheio);
      }
    });
  });

  describe("contexto do aluno", () => {
    it("sem perfil, instrui a perguntar em vez de assumir", () => {
      expect(buildSystemPrompt()).toMatch(/Nada conhecido ainda/);
    });

    it("com perfil, injeta os dados e proíbe repetir a pergunta", () => {
      const prompt = buildSystemPrompt({
        profile: { name: "Pedro", product: "Mentoria", ticket: 15000, niche: "Saúde" },
      });

      expect(prompt).toContain("Pedro");
      expect(prompt).toContain("Mentoria");
      expect(prompt).toContain("R$ 15.000");
      expect(prompt).toMatch(/Não pergunte de novo/i);
    });

    it("omite campo ausente em vez de escrever undefined", () => {
      const prompt = buildSystemPrompt({ profile: { name: "Pedro" } });
      expect(prompt).toContain("Pedro");
      expect(prompt).not.toContain("undefined");
    });
  });

  describe("bloco de roleplay", () => {
    const base = {
      objective: "contornar tá caro",
      clientProfile: "Pressiona preço",
      difficulty: "campo",
    } as const;

    it("manda entrar no personagem sem repetir o setup", () => {
      const prompt = buildSystemPrompt({ training: { ...base } });

      expect(prompt).toContain("SESSÃO DE ROLEPLAY ATIVA");
      expect(prompt).toContain("Pressiona preço");
      expect(prompt).toMatch(/NÃO pergunte nada/);
    });

    it("nível inferno endurece o lead", () => {
      const campo = buildSystemPrompt({ training: { ...base } });
      const inferno = buildSystemPrompt({ training: { ...base, difficulty: "inferno" } });

      expect(campo).not.toContain("NÍVEL INFERNO");
      expect(inferno).toContain("NÍVEL INFERNO");
    });

    it("loop adaptativo manda o lead atacar os erros anteriores", () => {
      const prompt = buildSystemPrompt({
        training: {
          ...base,
          recentDebriefs: [{ date: "01/08", score: 6, missingPlay: "cedeu desconto" }],
        },
      });

      expect(prompt).toContain("cedeu desconto");
      expect(prompt).toMatch(/testar exatamente essas fraquezas/);
    });

    it("fica fora do prompt quando não há sessão", () => {
      expect(buildSystemPrompt()).not.toContain("SESSÃO DE ROLEPLAY ATIVA");
    });
  });

  it("carrega os 4 modos e as regras invioláveis", () => {
    const prompt = buildSystemPrompt();

    for (const modo of ["CONSULTA DE TÉCNICA", "ROLEPLAY", "FEEDBACK DE CALL", "OBJEÇÃO RELÂMPAGO"]) {
      expect(prompt).toContain(modo);
    }
    for (const regra of ["R1.", "R6.", "R7.", "R10."]) {
      expect(prompt).toContain(regra);
    }
  });

  it("o debriefing pede JSON estrito com o schema que o app parseia", () => {
    for (const campo of ["result", "score", "hits", "turning_points", "missing_play", "next_training"]) {
      expect(DEBRIEF_INSTRUCTION).toContain(`"${campo}"`);
    }
    expect(DEBRIEF_INSTRUCTION).toMatch(/sem cercas de código/);
  });
});
