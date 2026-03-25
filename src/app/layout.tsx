import type { Metadata } from 'next';
import { DM_Serif_Display, DM_Sans } from 'next/font/google';
import Providers from './Providers';
import Nav from '@/src/components/Nav';

const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Mailable | 행사 자동 메일링',
  description: '행사 자동 메일링 관리 콘솔',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${dmSerif.variable} ${dmSans.variable}`}>
      <body style={{ fontFamily: "var(--font-sans, 'DM Sans', sans-serif)", background: '#faf9f7', margin: 0, padding: 0 }}>
        <Providers>
          <Nav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
