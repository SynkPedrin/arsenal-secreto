import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * Saída da área de acesso de volta para a prévia da página de vendas.
 *
 * Existe porque quem entra em /curso por engano ou sem compra ficava sem
 * caminho de volta: a única referência à página de vendas era um link de
 * rodapé que abria em outra aba e tirava a pessoa do sistema.
 */
export function BackToVault({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/arsenal-secreto"
      className={`group inline-flex items-center gap-2 text-xs text-muted transition-colors duration-200 hover:text-gold-soft ${className}`}
    >
      <ArrowLeft
        size={14}
        strokeWidth={1.9}
        aria-hidden
        className="transition-transform duration-200 group-hover:-translate-x-0.5"
      />
      Voltar para o Arsenal Secreto
    </Link>
  );
}
