import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma Composer packages the self-contained folder that only standalone
  // output produces, so the deploy needs this; `next start` is unaffected.
  output: "standalone",
  reactCompiler: true,
};

export default nextConfig;
