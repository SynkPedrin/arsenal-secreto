"use client";

import { Mic, MicOff } from "lucide-react";
import { MiniWaveform } from "@/components/sphere/MiniWaveform";
import { saveDeviceId } from "@/lib/audio/devices";
import { useSettings } from "@/lib/settings";
import { useVoiceCapture } from "./useVoiceCapture";

/**
 * Escolha e teste do microfone.
 * Os labels do sistema só ficam legíveis depois da primeira permissão — por
 * isso o botão de teste é também o que revela os nomes dos dispositivos.
 */
export function MicPicker() {
  const [settings, setSettings] = useSettings();

  const voice = useVoiceCapture({
    // No teste, nada é enviado ao chat: só queremos ver o nível e o texto.
    onTranscript: () => {},
    autoStopOnSilence: false,
    deviceId: settings.micDeviceId,
  });

  if (!voice.supported) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-hairline bg-void/50 p-4">
        <MicOff size={16} className="mt-0.5 shrink-0 text-muted" aria-hidden />
        <p className="text-xs leading-relaxed text-muted">
          Este navegador não expõe captura de áudio. O microfone fica escondido no chat. Em HTTP
          sem TLS, só <code className="text-gold-soft">localhost</code> é considerado seguro.
        </p>
      </div>
    );
  }

  const unnamed = voice.devices.length > 0 && voice.devices.every((d) => d.label.startsWith("Microfone "));

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="mic" className="text-meta mb-2 block">
          Dispositivo
        </label>
        <select
          id="mic"
          value={settings.micDeviceId ?? ""}
          onChange={(e) => {
            const value = e.target.value || null;
            setSettings({ micDeviceId: value });
            saveDeviceId(value);
          }}
          className="w-full rounded-xl border border-hairline bg-void px-4 py-2.5 text-sm text-ink focus:border-hairline-strong focus:outline-none"
        >
          <option value="">Padrão do sistema</option>
          {voice.devices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label}
            </option>
          ))}
        </select>

        {unnamed ? (
          <p className="mt-2 text-xs text-muted">
            Os nomes reais aparecem depois que você autorizar o microfone uma vez — use o teste
            abaixo.
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => (voice.isRecording ? voice.cancel() : void voice.start())}
          className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs transition-all duration-200 ${
            voice.isRecording
              ? "border-amber-burnt bg-amber-burnt/15 text-amber-burnt"
              : "border-hairline text-muted hover:border-hairline-strong hover:text-gold-soft"
          }`}
        >
          <Mic size={13} strokeWidth={1.9} aria-hidden />
          {voice.isRecording ? "Parar teste" : "Testar microfone"}
        </button>

        <MiniWaveform levelSource={voice.level} active={voice.isRecording} width={150} />

        {voice.isRecording && voice.activeDevice ? (
          <span className="text-meta min-w-0 truncate">{voice.activeDevice.label}</span>
        ) : null}
      </div>

      {voice.isRecording ? (
        <div className="rounded-xl border border-hairline bg-void/50 p-4">
          <p className="text-meta mb-1.5">Transcrição ao vivo</p>
          <p className="min-h-5 text-sm leading-snug text-ink" aria-live="polite">
            {voice.liveTranscript || "Fale alguma coisa…"}
          </p>
        </div>
      ) : null}

      {voice.error ? <p className="text-xs text-amber-burnt">{voice.error}</p> : null}
    </div>
  );
}
