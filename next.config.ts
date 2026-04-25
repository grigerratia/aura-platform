/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'yzjxskbmcmzmipggwfop.supabase.co', // URL exacta de tu error
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
