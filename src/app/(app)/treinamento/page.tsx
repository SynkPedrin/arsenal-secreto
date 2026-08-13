"use client";

import { useState } from "react";
import { DebriefCard } from "@/components/training/DebriefCard";
import { SparringSession } from "@/components/training/SparringSession";
import { TrainingWizard } from "@/components/training/TrainingWizard";
import { saveRecord } from "@/lib/training/store";
import type { Debrief, TrainingSetup } from "@/lib/training/types";

type Phase =
  | { step: "setup" }
  | { step: "sparring"; setup: TrainingSetup; run: number }
  | { step: "debrief"; setup: TrainingSetup; debrief: Debrief | null; raw?: string };

export default function TreinamentoPage() {
  const [phase, setPhase] = useState<Phase>({ step: "setup" });

  if (phase.step === "setup") {
    return (
      <TrainingWizard onStart={(setup) => setPhase({ step: "sparring", setup, run: 0 })} />
    );
  }

  if (phase.step === "sparring") {
    return (
      // `run` na key força uma sessão limpa em "treinar de novo".
      <SparringSession
        key={`${phase.setup.clientProfile}-${phase.run}`}
        setup={phase.setup}
        onFinished={(debrief, raw) => {
          if (debrief) saveRecord(phase.setup, debrief);
          setPhase({ step: "debrief", setup: phase.setup, debrief, raw });
        }}
      />
    );
  }

  return (
    <DebriefCard
      debrief={phase.debrief}
      raw={phase.raw}
      onRepeat={() =>
        setPhase({ step: "sparring", setup: phase.setup, run: Math.floor(Math.random() * 1e6) })
      }
      onNew={() => setPhase({ step: "setup" })}
    />
  );
}
