'use client';

import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import styled from '@emotion/styled';

const Bar = styled.nav<{ sticky?: boolean }>`
  position: sticky;
  top: 0;
  z-index: 20;
  background: ${({ theme }) => theme.color.card};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  padding: 0.75rem 1rem;
`;

const Wrap = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 1rem;
  align-items: center;
`;

const Brand = styled(Link)`
  font-weight: 700;
  font-size: 1.05rem;
  color: ${({ theme }) => theme.color.text};
  text-decoration: none;

  &:hover { color: ${({ theme }) => theme.color.primary}; }
`;

const Menu = styled.ul`
  display: flex; gap: 0.75rem;
  list-style: none; padding: 0; margin: 0;

  a {
    display: inline-block;
    padding: 0.4rem 0.6rem;
    border-radius: 10px;
    color: ${({ theme }) => theme.color.sub};
    text-decoration: none;
  }
  a[aria-current='page'],
  a:hover { background: ${({ theme }) => theme.color.bg}; color: ${({ theme }) => theme.color.text}; }
`;

const Actions = styled.div`
  display: flex; gap: 0.5rem; align-items: center;

  button {
    border: 1px solid ${({ theme }) => theme.color.border};
    background: ${({ theme }) => theme.color.card};
    border-radius: 10px;
    padding: 0.45rem 0.75rem;
    cursor: pointer;
    font-size: 0.9rem;
    
    &:hover {
      background: ${({ theme }) => theme.color.bg};
    }
  }
`;

const UserInfo = styled.span`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.color.sub};
  margin-right: 0.5rem;
`;

export default function Nav() {
  const { data: session } = useSession();
  const user = session?.user;

  const handleSettings = () => {
    // For now, just show an alert - this would open a settings modal/page
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
          <li><Link href="/templates">이메일 템플릿</Link></li>
          <li><Link href="/campaigns">캠페인 현황</Link></li>
        </Menu>
        <Actions>
          {user ? (
            <>
              <UserInfo>
                안녕하세요, {user.name || user.email}님
              </UserInfo>
              <button type="button" onClick={handleSettings}>
                설정
              </button>
              <button type="button" onClick={handleLogout}>
                로그아웃
              </button>
            </>
          ) : (
            <Link href="/login">
              <button type="button">로그인</button>
            </Link>
          )}
        </Actions>
      </Wrap>
    </Bar>
  );
}
