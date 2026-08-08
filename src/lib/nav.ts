import { Brain, Database, KeyRound, MessagesSquare, SlidersHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: "/" | "/base-central" | "/arsenal-secreto" | "/conversas" | "/config";
  label: string;
  hint: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "IA", hint: "Conversar com o Arsenal", icon: Brain },
  { href: "/base-central", label: "Base Central", hint: "Gestão do cérebro", icon: Database },
  { href: "/arsenal-secreto", label: "Arsenal Secreto", hint: "O cofre", icon: KeyRound },
  { href: "/conversas", label: "Conversas", hint: "Histórico", icon: MessagesSquare },
  { href: "/config", label: "Configurações", hint: "Modelo e persona", icon: SlidersHorizontal },
] as const;
