import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O projeto já tem README; não gerar AGENTS.md/CLAUDE.md a cada dev.
  agentRules: false,
};

export default nextConfig;
