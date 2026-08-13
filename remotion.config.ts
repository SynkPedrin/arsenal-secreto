import { Config } from "@remotion/cli/config";

/**
 * Configuração do Studio e do render.
 *
 * O entry point vive em src/remotion/index.ts, separado do app Next: são dois
 * alvos de build diferentes que compartilham só os componentes da composição.
 */
Config.setEntryPoint("./src/remotion/index.ts");
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
