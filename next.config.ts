import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    poweredByHeader: false,
    output: process.env.DOCKER_BUILD === "1" ? "standalone" : undefined,
    serverExternalPackages: ["pg", "pg-native", "@prisma/adapter-pg"],
    typescript: { ignoreBuildErrors: true },
    experimental: {
        serverActions: { allowedOrigins: ["brain.jetmind.io", "localhost:3001"] },
    },
};

export default nextConfig;
