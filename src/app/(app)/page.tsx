import { Suspense } from "react";
import { ChatView } from "@/components/chat/ChatView";

/**
 * A Home lê `?c=` para retomar uma conversa do histórico, e `useSearchParams`
 * só resolve no cliente. O Suspense é o que mantém a rota pré-renderizada em
 * vez de virar render sob demanda por causa de um parâmetro opcional.
 */
export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <ChatView />
    </Suspense>
  );
}
