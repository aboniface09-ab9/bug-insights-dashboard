import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// No `base` override. We previously had `base: "/assets/"` for a Vercel
// routing setup, which made Cloudflare Workers Assets redirect `/` →
// `/assets/` and break the SSR worker's root-path handling. Default base
// of "/" is what Cloudflare + TanStack Start expect.
export default defineConfig({});