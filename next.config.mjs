const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHost = supabaseUrl ? new URL(supabaseUrl).hostname : null;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  images: {
    // Gallery images from the public web-showcase bucket only.
    remotePatterns: supabaseUrl ? [new URL(`${supabaseUrl}/storage/v1/object/public/web-showcase/**`)] : [],
    // Needed only for the local Supabase stack (127.0.0.1); stays off against the hosted project.
    dangerouslyAllowLocalIP: supabaseHost === "127.0.0.1" || supabaseHost === "localhost",
  },
  devIndicators: {
    position: "bottom-right",
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/dashboard/default",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
