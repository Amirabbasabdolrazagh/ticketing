/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactCompiler: true,
  serverExternalPackages: ["@google-cloud/speech", "@google-cloud/storage"],
  async headers() {
    return [{
      source: "/:path*",
      headers: [{ key: "Permissions-Policy", value: "microphone=(self)" }],
    }];
  },
};

export default nextConfig;
