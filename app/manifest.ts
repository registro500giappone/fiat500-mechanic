import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Fiat 500 Mechanic',
    short_name: 'Fiat500',
    description: 'Classic Fiat 500 Hands-free Mechanic Assistant',
    start_url: '/',
    display: 'standalone',
    background_color: '#030712',
    theme_color: '#dc2626',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}