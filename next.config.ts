import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Two deploy targets want different build output, so this picks per target.
  //
  // Prisma Composer packages the self-contained `.next/standalone` folder, which
  // only `output: "standalone"` produces — without it the deploy stops at
  // ASSEMBLE.BUILD_FAILED. Vercel instead traces its own output, and its
  // post-build step failed reading `.next/next-server.js.nft.json` while
  // `output` was set. VERCEL is defined on every Vercel build, so each target
  // gets the layout it expects and neither is built for the other's pipeline.
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  reactCompiler: true,
};

export default nextConfig;
