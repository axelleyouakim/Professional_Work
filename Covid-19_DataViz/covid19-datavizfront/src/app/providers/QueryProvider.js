'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

/**
 * ════════════════════════════════════════════════════════════
 * QUERY PROVIDER - Configuration TanStack Query
 * ════════════════════════════════════════════════════════════
 * 
 * ✅ Utilise gcTime (garbage collection time) au lieu de cacheTime (déprécié en v5)
 * ✅ Cache de 5 minutes (staleTime)
 * ✅ Garde les données en mémoire 10 minutes (gcTime)
 * ✅ Pas de refetch automatique au focus/mount
 */
export default function QueryProvider({ children }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,        // 5 minutes - données considérées fraîches
            gcTime: 10 * 60 * 1000,          // 10 minutes - garbage collection (anciennement cacheTime)
            refetchOnWindowFocus: false,     // Pas de refetch au focus
            retry: 1,                        // 1 seul retry en cas d'erreur
            refetchOnMount: false,           // Pas de refetch au mount si données en cache
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}