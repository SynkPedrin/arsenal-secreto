import {
  Brain,
  ChartNoAxesColumn,
  KeyRound,
  MessagesSquare,
  SlidersHorizontal,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: "/" | "/treinamento" | "/analytics" | "/arsenal-secreto" | "/conversas" | "/config";
  label: string;
  hint: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "IA", hint: "Conversar com a IA Arsenal", icon: Brain },
  { href: "/treinamento", label: "Treinamento", hint: "Sparring com cliente real", icon: Target },
  {
    href: "/analytics",
    label: "Analytics",
    hint: "Leitura dos seus treinos e calls",
    icon: ChartNoAxesColumn,
  },
  { href: "/arsenal-secreto", label: "Arsenal Secreto", hint: "O cofre", icon: KeyRound },
  { href: "/conversas", label: "Conversas", hint: "Histórico", icon: MessagesSquare },
  { href: "/config", label: "Configurações", hint: "Perfil, voz e modelo", icon: SlidersHorizontal },
] as const;
