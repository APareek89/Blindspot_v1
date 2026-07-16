/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The dashboard is a pure HTTP client of the /v1 gateway — no server secrets baked in.
  // BLINDSPOT_GATEWAY_URL (default http://localhost:8787) is read server-side only.
};

export default nextConfig;
