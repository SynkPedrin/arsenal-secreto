import { Sidebar } from "@/components/layout/Sidebar";
import { StatusPill } from "@/components/layout/StatusPill";

/** Moldura do aplicativo: barra lateral, status e a atmosfera de fundo. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="ambient" aria-hidden />

      <Sidebar initials="PE" />

      <div className="fixed top-5 right-5 z-30">
        <StatusPill status="online" />
      </div>

      <main className="relative z-10 min-h-dvh pb-16 md:pb-0 md:pl-[var(--rail-w)]">
        {children}
      </main>
    </>
  );
}
