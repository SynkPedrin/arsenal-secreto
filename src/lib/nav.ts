import {
  Brain,
  ChartNoAxesColumn,
  GraduationCap,
  KeyRound,
  MessagesSquare,
  SlidersHorizontal,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href:
    | "/ia"
    | "/treinamento"
    | "/analytics"
    | "/curso"
    | "/arsenal-secreto"
    | "/conversas"
    | "/config";
  label: string;
  hint: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/ia", label: "IA", hint: "Conversar com a IA Arsenal", icon: Brain },
  { href: "/treinamento", label: "Treinamento", hint: "Sparring com cliente real", icon: Target },
  {
    href: "/analytics",
    label: "Analytics",
    hint: "Leitura dos seus treinos e calls",
    icon: ChartNoAxesColumn,
  },
  { href: "/curso", label: "Curso", hint: "As aulas que você comprou", icon: GraduationCap },
  { href: "/arsenal-secreto", label: "Arsenal Secreto", hint: "O cofre", icon: KeyRound },
  { href: "/conversas", label: "Conversas", hint: "Histórico", icon: MessagesSquare },
  { href: "/config", label: "Configurações", hint: "Perfil, voz e modelo", icon: SlidersHorizontal },
] as const;
