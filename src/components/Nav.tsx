'use client';

import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import styled from '@emotion/styled';

const Bar = styled.nav`
  position: sticky;
  top: 0;
  z-index: 20;
  background: ${({ theme }) => theme.color.card};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  padding: 0 1.25rem;
  height: 52px;
  display: flex;
  align-items: center;
`;

const Wrap = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 1rem;
  align-items: center;
`;

const Brand = styled(Link)`
  font-family: var(--font-serif, 'DM Serif Display', serif);
  font-size: 1.15rem;
  color: ${({ theme }) => theme.color.text};
  text-decoration: none;
  letter-spacing: -0.3px;

  &:hover { color: ${({ theme }) => theme.color.accent}; }
`;

const Menu = styled.ul`
  display: flex;
  gap: 0.25rem;
  list-style: none;
  padding: 0;
  margin: 0;

  a {
    display: inline-block;
    padding: 0.35rem 0.65rem;
    border-radius: 8px;
    font-size: 0.875rem;
    color: ${({ theme }) => theme.color.sub};
    text-decoration: none;
    transition: background 0.15s, color 0.15s;
  }

  a[aria-current='page'],
  a:hover {
    background: ${({ theme }) => theme.color.bg};
    color: ${({ theme }) => theme.color.text};
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const UserInfo = styled.span`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.color.muted};
`;

const NavBtn = styled.button`
  appearance: none;
  border: 1px solid ${({ theme }) => theme.color.border};
  background: transparent;
  border-radius: 8px;
  padding: 0.38rem 0.8rem;
  cursor: pointer;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.color.sub};
  transition: background 0.15s, color 0.15s;

  &:hover {
    background: ${({ theme }) => theme.color.bg};
    color: ${({ theme }) => theme.color.text};
  }
`;

const LogoutBtn = styled(NavBtn)`
  &:hover {
    background: ${({ theme }) => theme.color.accentLight};
    border-color: rgba(232, 83, 58, 0.25);
    color: ${({ theme }) => theme.color.accent};
  }
`;

export default function Nav() {
  const { data: session } = useSession();
  const user = session?.user;
  const pathname = usePathname();

  if (pathname === '/login') return null;

  const handleSettings = () => {
    alert('설정 기능은 곧 추가될 예정입니다.');
  };

  const handleLogout = async () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      await signOut({ callbackUrl: '/login' });
    }
  };

  return (
    <Bar>
      <Wrap>
        <Brand href="/">Mailable</Brand>
        <Menu>
          <li><Link href="/">대시보드</Link></li>
          <li><Link href="/campaigns">캠페인 현황</Link></li>
        </Menu>
        <Actions>
          {user ? (
            <>
              <UserInfo>{user.name || user.email}</UserInfo>
              <NavBtn type="button" onClick={handleSettings}>설정</NavBtn>
              <LogoutBtn type="button" onClick={handleLogout}>로그아웃</LogoutBtn>
            </>
          ) : (
            <Link href="/login">
              <NavBtn type="button">로그인</NavBtn>
            </Link>
          )}
        </Actions>
      </Wrap>
    </Bar>
  );
}
