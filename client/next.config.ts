import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    const apiUrl = process.env.CMS_API_URL ?? "http://localhost:10000/api";
    return [{ source: "/api/:path*", destination: `${apiUrl}/:path*` }];
  },
  images: {
    qualities: [75, 88],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/d/**",
      },
    ],
  },
};

export default nextConfig;
