'use client';

import styled from '@emotion/styled';

const Card = styled.article`
  background: ${({ theme }) => theme.color.card};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: ${({ theme }) => theme.shadow.card};
  padding: 1rem;
`;

const Label = styled.h3`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.color.sub};
  margin: 0 0 0.5rem;
`;

const Value = styled.div<{ tone?: 'success' | 'warning' | 'danger' }>`
  font-size: 1.75rem; font-weight: 700; line-height: 1.2;
  color: ${({ theme, tone }) =>
    tone === 'success' ? theme.color.success :
    tone === 'warning' ? theme.color.warning :
    tone === 'danger' ? theme.color.danger :
    theme.color.text};
`;

export default function StatCard(
  { label, value, tone }: { label: string; value: string | number; tone?: 'success'|'warning'|'danger' }
) {
  return (
    <Card role="region" aria-label={label}>
      <Label>{label}</Label>
      <Value tone={tone} aria-live="polite">{value}</Value>
    </Card>
  );
}
