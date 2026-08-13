/**
 * Captura o screenshot de fallback da aba Arsenal Secreto.
 *
 *   npm run capture-preview
 *
 * A prévia primária é um iframe do site de vendas. Se um dia ele passar a
 * mandar X-Frame-Options, a interface cai para a imagem gerada aqui.
 *
 * O Playwright é opcional de propósito: baixar um Chromium só para isso pesa
 * ~150MB, e o iframe funciona hoje. Sem ele instalado, o comando explica o que
 * fazer em vez de quebrar.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";

const url =
  process.env.NEXT_PUBLIC_ARSENAL_SALES_URL ??
  process.env.ARSENAL_SECRETO_URL ??
  "https://arsenalsecreto.lovable.app/";

const out = path.join(process.cwd(), "public", "previews", "arsenal-secreto.png");

type Chromium = {
  launch(): Promise<{
    newPage(options: unknown): Promise<{
      goto(url: string, options: unknown): Promise<unknown>;
      waitForTimeout(ms: number): Promise<void>;
      screenshot(options: unknown): Promise<unknown>;
    }>;
    close(): Promise<void>;
  }>;
};

async function loadChromium(): Promise<Chromium | null> {
  // Especificador em variável: o TypeScript não tenta resolver os tipos de um
  // pacote que é opcional por decisão, e o import segue funcionando em runtime.
  const spec = "playwright";
  try {
    const mod: unknown = await import(spec);
    return (mod as { chromium: Chromium }).chromium;
  } catch {
    return null;
  }
}

const chromium = await loadChromium();

if (!chromium) {
  console.error(
    "\nPlaywright não está instalado — ele é opcional neste projeto.\n\n" +
      "  npm i -D playwright && npx playwright install chromium\n\n" +
      "Depois rode `npm run capture-preview` de novo. Enquanto isso a prévia\n" +
      "continua vindo do iframe, que é o caminho primário.\n",
  );
  process.exit(1);
}

await mkdir(path.dirname(out), { recursive: true });

const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
  // A LP anima a entrada; sem esta pausa o screenshot pega o meio da transição.
  await page.waitForTimeout(2500);
  await page.screenshot({ path: out });

  console.log(`Prévia salva em ${path.relative(process.cwd(), out)}`);
} finally {
  await browser.close();
}
