import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Aron — The control plane for AI agents',
  description: 'Trace every run. Gate consequential actions. Keep humans in control.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-scroll-behavior="smooth"><body>{children}</body></html>;
}
