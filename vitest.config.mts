import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: { include: ["src/lib/**/*.ts"], reporter: ["text", "html"] },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // "server-only" lança fora do runtime do React Server Components.
      // Nos testes ele vira um módulo vazio — a garantia que importa aqui é
      // o build do Next, que é quem de fato barra o import no cliente.
      "server-only": path.resolve(__dirname, "src/test/server-only-stub.ts"),
    },
  },
});
