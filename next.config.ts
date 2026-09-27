import type { NextConfig } from "next";

// Alt adreste yayın için (ör. aiotechs.cloud/turkdili) derlemeden önce BASE_PATH=/turkdili verilir; boşsa kök adres kullanılır.
const basePath = process.env.BASE_PATH?.replace(/\/+$/, "") || "";

// NEXT_DIST_DIR: açık sunucunun derlemesini bozmadan ayrı klasöre deneme derlemesi almak için (ör. .next-test).
const nextConfig: NextConfig = {
  basePath,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
