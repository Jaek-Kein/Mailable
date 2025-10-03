'use client';

import Link from 'next/link';
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
  display: flex; gap: 0.5rem;

  button {
    border: 1px solid ${({ theme }) => theme.color.border};
    background: ${({ theme }) => theme.color.card};
    border-radius: 10px;
    padding: 0.45rem 0.75rem;
    cursor: pointer;
  }
`;

export default function Nav() {
  return (
    <Bar>
      <Wrap>
        <Brand href="/">EventSender</Brand>
        <Menu>
          <li><Link href="/" aria-current="page">대시보드</Link></li>
          <li><Link href="/events">행사 관리</Link></li>
          <li><Link href="/mailings">메일링</Link></li>
          <li><Link href="/attendees">참석자</Link></li>
          <li><Link href="/reports">리포트</Link></li>
        </Menu>
        <Actions>
          <button type="button">설정</button>
          <button type="button">로그아웃</button>
        </Actions>
      </Wrap>
    </Bar>
  );
}
