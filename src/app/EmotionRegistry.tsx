'use client';

import React from 'react';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { useServerInsertedHTML } from 'next/navigation';

// 고유 key를 줘서 Next와 충돌 방지
export default function EmotionRegistry({ children }: { children: React.ReactNode }) {
  const cache = React.useMemo(() => {
    const c = createCache({ key: 'css', prepend: true });
    c.compat = true;
    return c;
  }, []);

  useServerInsertedHTML(() => (
    <style
      data-emotion={`${cache.key} ${Object.keys(cache.inserted).join(' ')}`}
      dangerouslySetInnerHTML={{
        __html: Object.values(cache.inserted).join(' '),
      }}
    />
  ));

  return <CacheProvider value={cache}>{children}</CacheProvider>;
}
