import { cpSync } from "node:fs";
import path from "node:path";
import { defineConfig, type PluginOption } from "vite";
import { enterProdPlugin } from "vite-plugin-enter-dev";

export default defineConfig(({ mode }) => {
  const server = { host: "::", port: 8080 };

  if (mode !== "mobile" && mode !== "test") {
    const site = path.resolve(__dirname, "site");
    const output = path.resolve(__dirname, "dist");
    return {
      root: site,
      publicDir: false,
      appType: "mpa",
      server,
      build: {
        outDir: output,
        emptyOutDir: true,
        rollupOptions: {
          input: {
            index: path.join(site, "index.html"),
            privacidad: path.join(site, "privacidad.html"),
          },
        },
      },
      plugins: [{
        name: "smartguard-public-assets",
        apply: "build",
        closeBundle() {
          for (const asset of ["downloads", "branding", "robots.txt"]) {
            cpSync(path.resolve(__dirname, "public", asset), path.join(output, asset), { recursive: true });
          }
        },
      }],
    };
  }

  return {
    server,
    plugins: enterProdPlugin().filter(Boolean) as PluginOption[],
    resolve: { alias: { "@": path.resolve(__dirname, "src") } },
    base: "/",
    build: { outDir: "dist" },
  };
});
