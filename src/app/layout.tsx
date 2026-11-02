import type { Metadata } from 'next';
import './globals.css';
import './manrope.css';
export const metadata: Metadata = { title: 'Atomic Canvas · Tu laboratorio de química', description: 'Explora átomos y construye moléculas con tus manos. Un laboratorio educativo con reacciones 3D y NOVA, tu guía de química.' };
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return <html lang="es"><body>{children}</body></html>;
}

