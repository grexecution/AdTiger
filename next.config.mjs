/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "example.com",
      },
      {
        protocol: "https",
        hostname: "scontent-vie1-1.xx.fbcdn.net",
      },
      {
        protocol: "https",
        hostname: "scontent.xx.fbcdn.net",
      },
      {
        protocol: "https",
        hostname: "graph.facebook.com",
      },
      {
        protocol: "https",
        hostname: "lookaside.fbsbx.com",
      },
    ],
  },
  redirects() {
    return [
      {
        source: "/",
        destination: "/dashboard",
        permanent: false,
        has: [
          {
            type: "cookie",
            key: "authjs.session-token",
          },
        ],
      },
    ]
  },
}

export default nextConfig