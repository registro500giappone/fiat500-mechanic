import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FIAT 500 AI音声マニュアル', // アプリ起動時や一覧に出る正式名称
    short_name: '音声マニュアル',      // ★ホーム画面のアイコン下に表示される名前
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