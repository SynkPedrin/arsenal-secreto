export type SystemStatus = "online" | "syncing" | "offline";

const COPY: Record<SystemStatus, { label: string; dot: string; text: string }> = {
  online: { label: "Arsenal online", dot: "bg-gold", text: "text-gold-soft" },
  syncing: { label: "Sincronizando", dot: "bg-gold-soft", text: "text-gold-soft" },
  offline: { label: "Arsenal offline", dot: "bg-amber-burnt", text: "text-muted" },
};

export function StatusPill({ status = "online" }: { status?: SystemStatus }) {
  const { label, dot, text } = COPY[status];

  return (
    <div
      role="status"
      className="pointer-events-none flex items-center gap-2 rounded-full border border-hairline bg-panel/70 px-3 py-1.5 backdrop-blur-md"
    >
      <span
        aria-hidden
        className={`size-1.5 rounded-full ${dot} ${status === "offline" ? "" : "animate-pulse-dot"}`}
      />
      <span className={`text-meta ${text}`}>{label}</span>
    </div>
  );
}
