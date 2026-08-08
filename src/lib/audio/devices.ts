"use client";

export type AudioInput = { deviceId: string; label: string };

const KEY = "arsenal:mic-device";

/**
 * Lista os microfones disponíveis.
 * Os labels só aparecem depois que a permissão foi concedida uma vez — antes
 * disso o browser devolve strings vazias, e aí rotulamos por posição.
 */
export async function listAudioInputs(): Promise<AudioInput[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((device) => device.kind === "audioinput")
      .map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `Microfone ${index + 1}`,
      }));
  } catch {
    return [];
  }
}

export function savedDeviceId(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function saveDeviceId(deviceId: string | null) {
  try {
    if (deviceId) localStorage.setItem(KEY, deviceId);
    else localStorage.removeItem(KEY);
  } catch {
    // Sem persistência: vale só para esta sessão.
  }
}
