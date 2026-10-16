import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: { globalNotFound: true },
  redirects() {
    return [
      {
        source: "/find-a-tutor/:path*",
        destination: "/find-a-teacher",
        permanent: false,
      },
      {
        source: "/become-a-tutor",
        destination: "/for-teachers",
        permanent: false,
      },
      { source: "/tutors/:id", destination: "/find-a-teacher", permanent: false },
      // Materials, questions and results now live on each class page.
      { source: "/:lang(ar|fr)/teach/:section(materials|questions|results)", destination: "/:lang/teach", permanent: false },
      { source: "/:lang(ar|fr)/teachers/:id", destination: "/:lang/teachers?id=:id", permanent: false },
      { source: "/schools", destination: "/about-us", permanent: false },
      {
        source: "/parent-councils",
        destination: "/about-us",
        permanent: false,
      },
      {
        source: "/learning-support",
        destination: "/how-it-works",
        permanent: false,
      },
      {
        source: "/blog/:path*",
        destination: "/how-it-works",
        permanent: false,
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
