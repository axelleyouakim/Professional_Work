'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import * as api from '../../services/api';

export default function QueryProvider({ children }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10 * 60 * 1000,
            
            gcTime: 30 * 60 * 1000,
            
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            refetchOnMount: false,
            
            retry: 1,
            retryDelay: 1000,
            
            networkMode: 'offlineFirst',
          },
        },
      })
  );

  useEffect(() => {
    const prefetchCriticalData = async () => {
      console.log('[QueryProvider] Starting critical data prefetch...');

      try {
        await queryClient.prefetchQuery({
          queryKey: ['world-atlas'],
          queryFn: async () => {
            const response = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json');
            return response.json();
          },
          staleTime: Infinity,
        });
        console.log('World atlas prefetched');

        await queryClient.prefetchQuery({
          queryKey: ['covid', 'per-country', null, 'cases'],
          queryFn: async () => {
            const data = await api.getTotalCasesPerCountry(null);
            return data?.data || [];
          },
          staleTime: 10 * 60 * 1000,
        });
        console.log('Cases per country prefetched');

        await queryClient.prefetchQuery({
          queryKey: ['covid', 'per-country', null, 'deaths'],
          queryFn: async () => {
            const data = await api.getTotalDeathsPerCountry(null);
            return data?.data || [];
          },
          staleTime: 10 * 60 * 1000,
        });
        console.log('Deaths per country prefetched');

        await queryClient.prefetchQuery({
          queryKey: ['covid', 'per-country', null, 'recovered'],
          queryFn: async () => {
            const data = await api.getTotalRecoveredPerCountry(null);
            return data?.data || [];
          },
          staleTime: 10 * 60 * 1000,
        });
        console.log('Recovered per country prefetched');

        await queryClient.prefetchQuery({
          queryKey: ['allTimeSeriesData'],
          queryFn: async () => {
            return await api.getAllTimeSeriesData();
          },
          staleTime: Infinity,
        });
        console.log('All time series prefetched (CRITICAL for slider)');

        console.log('[QueryProvider] All critical data prefetched! Zero lag enabled.');
      } catch (error) {
        console.error('[QueryProvider] Prefetch error:', error.message);
      }
    };

    const timer = setTimeout(prefetchCriticalData, 100);

    return () => clearTimeout(timer);
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}