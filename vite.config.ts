import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import viteReact from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

// Plain Vite config for the Dahabo Global Logistics app (TanStack Start).
// This project no longer depends on the Lovable platform tooling.
export default defineConfig(async ({ command }) => {
  const plugins = [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      importProtection: {
        behavior: "error",
        client: {
          files: ["**/server/**"],
          specifiers: ["server-only"],
        },
      },
      // Redirect TanStack Start's bundled server entry to src/server.ts
      // (our SSR error wrapper). nitro/vite builds from this.
      server: { entry: "server" },
    }),
    viteReact(),
  ];

  // Only pull in nitro (the deploy/build adapter) for production builds.
  // Change the preset below to match where you deploy: "node-server" for a
  // plain Node host/VPS, "cloudflare-module" for Cloudflare Workers,
  // "vercel" for Vercel, "netlify" for Netlify, etc.
  if (command === "build") {
    const { nitro } = await import("nitro/vite");
plugins.push(nitro({ preset: "vercel" }));  }

  return {
    css: { transformer: "lightningcss" as const },
    resolve: {
      alias: { "@": `${process.cwd()}/src` },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    optimizeDeps: {
      include: ["react", "react-dom", "react-dom/client", "react/jsx-runtime", "react/jsx-dev-runtime"],
      ignoreOutdatedRequests: true,
    },
    server: {
      host: "::",
      port: 8080,
    },
    plugins,
  };
});
