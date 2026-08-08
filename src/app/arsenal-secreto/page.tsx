import { existsSync } from "node:fs";
import path from "node:path";
import { ParticleWaves } from "@/components/arsenal/ParticleWaves";
import { SitePreview } from "@/components/arsenal/SitePreview";

export const metadata = { title: "Arsenal Secreto" };

const PREVIEW_FILE = "/previews/arsenal-secreto.png";

export default function ArsenalSecretoPage() {
  const url =
    process.env.NEXT_PUBLIC_ARSENAL_SECRETO_URL ??
    process.env.ARSENAL_SECRETO_URL ??
    "https://arsenalsecreto.lovable.app/";

  // Só oferece o fallback se o screenshot existir de fato.
  const previewImage = existsSync(path.join(process.cwd(), "public", PREVIEW_FILE))
    ? PREVIEW_FILE
    : null;

  return (
    <div className="relative isolate min-h-dvh overflow-hidden">
      <ParticleWaves />

      <div className="mx-auto w-full max-w-5xl px-6 pt-16 pb-24 md:px-10">
        <header className="animate-rise mb-10 text-center">
          <p className="text-meta mb-3">O cofre</p>
          <h1 className="text-display text-3xl text-ink md:text-4xl">Arsenal Secreto</h1>
        </header>

        <div className="animate-rise">
          <SitePreview url={url} previewImage={previewImage} />
        </div>

        <p className="mt-10 text-center text-sm text-muted">O cofre está sendo preparado.</p>
      </div>
    </div>
  );
}
