import type { Metadata } from 'next';
import Providers from './Providers';
import Nav from '@/src/components/Nav';

export const metadata: Metadata = {
  title: 'EventSender | 행사 자동 메일링',
  description: '행사 자동 메일링 관리 콘솔',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <Providers>
          <Nav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
