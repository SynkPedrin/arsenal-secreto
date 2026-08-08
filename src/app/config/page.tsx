"use client";

import { MicPicker } from "@/components/chat/MicPicker";
import { MODELS } from "@/lib/ai/config";
import { useSettings } from "@/lib/settings";

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-6 py-4">
      <span className="min-w-0">
        <span className="block text-sm text-ink">{label}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted">{hint}</span>
      </span>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition-colors duration-200 ${
          checked ? "border-hairline-strong bg-gold/25" : "border-hairline bg-void"
        }`}
      >
        <span
          className={`absolute top-0.5 size-4 rounded-full transition-all duration-200 ${
            checked ? "left-[22px] bg-gold shadow-glow-sm" : "left-0.5 bg-muted"
          }`}
        />
      </button>
    </label>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  mono = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  mono?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-meta mb-2 block">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-xl border border-hairline bg-void px-4 py-2.5 text-sm text-ink placeholder:text-muted focus:border-hairline-strong focus:outline-none ${
          mono ? "font-mono" : ""
        }`}
      />
    </div>
  );
}

export default function ConfigPage() {
  const [settings, setSettings] = useSettings();

  return (
    <div className="mx-auto w-full max-w-3xl px-6 pt-16 pb-24 md:px-10">
      <header className="animate-rise mb-10">
        <p className="text-meta mb-3">Ajustes</p>
        <h1 className="text-display text-3xl text-ink md:text-4xl">Configurações</h1>
        <p className="mt-3 text-sm text-muted">
          Quem é você e como a IA fala com você. Fica salvo neste navegador até o Supabase entrar.
        </p>
      </header>

      <section className="panel animate-rise mb-6 p-6 md:p-8">
        <h2 className="text-display mb-6 text-lg text-ink">Seu perfil</h2>
        <p className="mb-6 text-xs leading-relaxed text-muted">
          Vai direto para o system prompt: calibra as objeções do sparring e os exemplos da
          consultoria. Sem isso, a IA pergunta tudo de novo a cada conversa.
        </p>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="name"
            label="Primeiro nome"
            value={settings.name}
            onChange={(name) => setSettings({ name })}
            placeholder="Pedro"
          />
          <Field
            id="niche"
            label="Nicho"
            value={settings.niche}
            onChange={(niche) => setSettings({ niche })}
            placeholder="Saúde"
          />
          <Field
            id="product"
            label="O que você vende"
            value={settings.product}
            onChange={(product) => setSettings({ product })}
            placeholder="Mentoria de gestão para clínicas"
          />
          <Field
            id="ticket"
            label="Ticket médio (R$)"
            mono
            value={settings.ticket ? String(settings.ticket) : ""}
            onChange={(raw) => setSettings({ ticket: Number(raw.replace(/\D/g, "")) || null })}
            placeholder="15000"
          />
        </div>
      </section>

      <section className="panel animate-rise mb-6 p-6 md:p-8">
        <h2 className="text-display mb-6 text-lg text-ink">Microfone</h2>
        <MicPicker />
      </section>

      <section className="panel animate-rise mb-6 p-6 md:p-8">
        <h2 className="text-display mb-2 text-lg text-ink">Voz</h2>
        <div className="divide-y divide-[var(--border-subtle)]">
          <Toggle
            label="Parar sozinho no silêncio"
            hint="Encerra a gravação após 2,5s sem fala. Desligado, você controla o início e o fim."
            checked={settings.autoStopOnSilence}
            onChange={(autoStopOnSilence) => setSettings({ autoStopOnSilence })}
          />
          <Toggle
            label="Envio direto por voz"
            hint="Envia assim que transcreve. Desligado, você tem 1,5s para editar antes do envio."
            checked={settings.directSend}
            onChange={(directSend) => setSettings({ directSend })}
          />
          <Toggle
            label="Resposta por voz"
            hint="A IA fala a resposta e a esfera pulsa no ritmo dela. Desligado por padrão — cada resposta falada custa."
            checked={settings.speakReplies}
            onChange={(speakReplies) => setSettings({ speakReplies })}
          />
        </div>

        <div className="mt-5 border-t border-hairline pt-5">
          <label htmlFor="speed" className="text-meta mb-3 block">
            Velocidade da fala · <span className="text-gold-soft">{settings.voiceSpeed.toFixed(2)}×</span>
          </label>
          <input
            id="speed"
            type="range"
            min={0.75}
            max={1.5}
            step={0.05}
            value={settings.voiceSpeed}
            onChange={(e) => setSettings({ voiceSpeed: Number(e.target.value) })}
            className="w-full accent-[var(--gold-core)]"
          />
        </div>
      </section>

      <section className="panel animate-rise p-6 md:p-8">
        <h2 className="text-display mb-6 text-lg text-ink">Motor</h2>
        <dl className="space-y-3 font-mono text-xs">
          {[
            ["Resposta", MODELS.main],
            ["Tarefas leves", MODELS.light],
            ["Transcrição", MODELS.transcription],
            ["Voz", MODELS.tts],
            ["Embeddings", MODELS.embedding],
          ].map(([label, model]) => (
            <div key={label} className="flex justify-between gap-4">
              <dt className="text-muted">{label}</dt>
              <dd className="text-gold-soft">{model}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-5 text-xs leading-relaxed text-muted">
          Trocar de modelo é uma linha em{" "}
          <code className="text-gold-soft">src/lib/ai/config.ts</code> ou a variável{" "}
          <code className="text-gold-soft">ARSENAL_MODEL</code>. Temperatura e budget do contexto
          RAG entram aqui quando a F2 ligar o cérebro.
        </p>
      </section>
    </div>
  );
}
