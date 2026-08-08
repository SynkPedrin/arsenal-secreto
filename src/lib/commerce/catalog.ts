/**
 * Catálogo de produtos.
 *
 * Fica em código, não no banco, de propósito: o conteúdo é versionado junto
 * com a interface e não exige seed. O banco guarda só o que é transacional —
 * compras e liberações. O elo entre os dois é o `slug`.
 */

export type Lesson = { title: string; duration?: string };
export type Module = { title: string; summary?: string; lessons: Lesson[] };

export type Product = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  /** coming_soon esconde o checkout e mostra lista de espera. */
  status: "coming_soon" | "live";
  salesUrl: string;
  checkoutUrl: string | null;
  /** ID do produto na Hotmart — casa o webhook com este slug. */
  hotmartProductId: string | null;
  modules: Module[];
};

const ARSENAL_SECRETO: Product = {
  slug: "arsenal-secreto",
  name: "Arsenal Secreto",
  tagline: "O método de closer high ticket do David William",
  description:
    "O acervo de campo que treina closers a conduzir a call em vez de reagir a ela: diagnóstico, condução, objeções e fechamento — do jeito que acontece na call, não no slide.",
  status: (process.env.NEXT_PUBLIC_ARSENAL_PRODUCT_STATUS as Product["status"]) ?? "coming_soon",
  salesUrl: process.env.NEXT_PUBLIC_ARSENAL_SALES_URL ?? "https://arsenalsecreto.lovable.app/",
  checkoutUrl: process.env.NEXT_PUBLIC_ARSENAL_CHECKOUT_URL || null,
  hotmartProductId: process.env.NEXT_PUBLIC_ARSENAL_HOTMART_PRODUCT_ID || null,
  // Estrutura provisória — o produto ainda não foi lançado.
  modules: [
    {
      title: "Fundamento",
      summary: "Por que a call se perde antes da objeção aparecer.",
      lessons: [{ title: "A postura que decide a call" }, { title: "Conexão sem bajulação" }],
    },
    {
      title: "Diagnóstico",
      summary: "A etapa que quase todo closer atropela.",
      lessons: [{ title: "As perguntas que abrem o cliente" }, { title: "Quando calar a boca" }],
    },
    {
      title: "Objeções",
      summary: "O que o cliente realmente diz quando diz 'tá caro'.",
      lessons: [
        { title: "Tá caro" },
        { title: "Preciso pensar" },
        { title: "Vou ver com meu sócio" },
      ],
    },
    {
      title: "Fechamento",
      summary: "Conduzir até o sim sem empurrar.",
      lessons: [{ title: "O fechamento que não parece fechamento" }, { title: "Follow-up que reabre" }],
    },
  ],
};

export const PRODUCTS: readonly Product[] = [ARSENAL_SECRETO];

export function productBySlug(slug: string): Product | undefined {
  return PRODUCTS.find((product) => product.slug === slug);
}

/**
 * Traduz o ID que a Hotmart manda no webhook para o slug interno.
 * Sem correspondência, cai no produto único do catálogo — assim uma compra
 * nunca é descartada só porque o ID ainda não foi configurado no .env.
 */
export function productSlugFromHotmart(hotmartProductId: string | null): string {
  if (hotmartProductId) {
    const match = PRODUCTS.find((p) => p.hotmartProductId === hotmartProductId);
    if (match) return match.slug;
  }
  return PRODUCTS[0].slug;
}
