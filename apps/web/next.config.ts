import type { NextConfig } from 'next';


const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'source.unsplash.com' },
      { protocol: 'https', hostname: 'mydaytogo.com' },
          { protocol: 'https', hostname: '*.wp.com' },
          { protocol: 'https', hostname: '*.zameen.com' },
          // ✅ S3 bucket (ADD THIS)
            {
                protocol: "https",
                hostname: "examinox.s3.us-east-1.amazonaws.com",
                pathname: "/**",
            }

    ],
  },
};

export default nextConfig;
