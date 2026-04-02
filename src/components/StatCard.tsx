'use client';

import styled from '@emotion/styled';

const Card = styled.article`
  background: ${({ theme }) => theme.color.card};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: ${({ theme }) => theme.shadow.card};
  padding: 1.1rem 1.25rem;

  @media (max-width: 480px) {
    padding: 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-direction: row-reverse;
    gap: 0.5rem;
  }
`;

const Label = styled.p`
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: 0.5px;
  color: ${({ theme }) => theme.color.muted};
  margin: 0 0 0.5rem;
  text-transform: uppercase;

  @media (max-width: 480px) {
    margin: 0;
    font-size: 0.75rem;
  }
`;

const Value = styled.div<{ tone?: 'success' | 'warning' | 'danger' }>`
  font-family: var(--font-serif, 'DM Serif Display', serif);
  font-size: 2rem;
  line-height: 1.1;
  color: ${({ theme, tone }) =>
    tone === 'success' ? theme.color.success :
    tone === 'warning' ? theme.color.warning :
    tone === 'danger'  ? theme.color.danger  :
    theme.color.text};

  @media (max-width: 480px) {
    font-size: 1.6rem;
  }
`;

export default function StatCard(
  { label, value, tone }: { label: string; value: string | number; tone?: 'success' | 'warning' | 'danger' }
) {
  return (
    <Card role="region" aria-label={label}>
      <Label>{label}</Label>
      <Value tone={tone} aria-live="polite">{value}</Value>
    </Card>
  );
}
