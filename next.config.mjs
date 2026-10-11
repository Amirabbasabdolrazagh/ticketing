/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactCompiler: true,
  async headers() {
    return [{
      source: "/:path*",
      headers: [{ key: "Permissions-Policy", value: "microphone=(self)" }],
    }];
  },
};

export default nextConfig;
