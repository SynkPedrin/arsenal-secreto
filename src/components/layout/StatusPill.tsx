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
      className="pointer-events-none flex items-center gap-2.5 rounded-full border border-hairline bg-[oklch(14%_0.005_60_/_0.72)] py-1.5 pr-3.5 pl-3 shadow-[inset_0_1px_0_0_oklch(100%_0_0_/_0.05)] backdrop-blur-md"
    >
      <span className="relative flex size-1.5 items-center justify-center">
        <span className={`absolute size-1.5 rounded-full ${dot}`} />
        {status !== "offline" ? (
          <span className={`absolute size-1.5 animate-ping rounded-full ${dot} opacity-60`} />
        ) : null}
      </span>
      <span className={`text-meta ${text}`}>{label}</span>
    </div>
  );
}
