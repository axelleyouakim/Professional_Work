'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import * as api from '../../services/api';

/**
 * ✅ QUERY CLIENT OPTIMISÉ POUR ZERO LAG
 * Stratégie:
 * 1. Cache très long (staleTime élevé)
 * 2. Pas de refetch automatique
 * 3. Prefetch agressif des données critiques
 */
export default function QueryProvider({ children }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // ✅ CACHE LONG: Les données restent fraîches pendant 10 minutes
            staleTime: 10 * 60 * 1000, // 10 minutes
            
            // ✅ GARDE EN MÉMOIRE: Données gardées 30 minutes même non utilisées
            gcTime: 30 * 60 * 1000, // 30 minutes
            
            // ✅ PAS DE REFETCH: Évite les requêtes inutiles
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            refetchOnMount: false,
            
            // ✅ RETRY MINIMAL: Échec rapide pour ne pas bloquer l'UI
            retry: 1,
            retryDelay: 1000,
            
            // ✅ NETWORK MODE: Mode optimiste
            networkMode: 'offlineFirst',
          },
        },
      })
  );

  // ✅ PREFETCH AU CHARGEMENT: Données critiques pré-chargées
  useEffect(() => {
    const prefetchCriticalData = async () => {
      console.log('🚀 [QueryProvider] Starting critical data prefetch...');

      try {
        // 1. Prefetch world atlas (nécessaire pour la carte)
        await queryClient.prefetchQuery({
          queryKey: ['world-atlas'],
          queryFn: async () => {
            const response = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json');
            return response.json();
          },
          staleTime: Infinity,
        });
        console.log('✅ World atlas prefetched');

        // 2. Prefetch données per country (utilisé par tous les composants)
        await queryClient.prefetchQuery({
          queryKey: ['covid', 'per-country', null, 'cases'],
          queryFn: async () => {
            const data = await api.getTotalCasesPerCountry(null);
            return data?.data || [];
          },
          staleTime: 10 * 60 * 1000,
        });
        console.log('✅ Cases per country prefetched');

        await queryClient.prefetchQuery({
          queryKey: ['covid', 'per-country', null, 'deaths'],
          queryFn: async () => {
            const data = await api.getTotalDeathsPerCountry(null);
            return data?.data || [];
          },
          staleTime: 10 * 60 * 1000,
        });
        console.log('✅ Deaths per country prefetched');

        await queryClient.prefetchQuery({
          queryKey: ['covid', 'per-country', null, 'recovered'],
          queryFn: async () => {
            const data = await api.getTotalRecoveredPerCountry(null);
            return data?.data || [];
          },
          staleTime: 10 * 60 * 1000,
        });
        console.log('✅ Recovered per country prefetched');

        // 3. ✅ CRITICAL: Prefetch ALL TIME SERIES (pour le slider)
        await queryClient.prefetchQuery({
          queryKey: ['allTimeSeriesData'],
          queryFn: async () => {
            return await api.getAllTimeSeriesData();
          },
          staleTime: Infinity, // Données historiques ne changent jamais
        });
        console.log('✅ All time series prefetched (CRITICAL for slider)');

        console.log('🎉 [QueryProvider] All critical data prefetched! Zero lag enabled.');
      } catch (error) {
        console.error('❌ [QueryProvider] Prefetch error:', error.message);
      }
    };

    // Lancer le prefetch après un court délai pour laisser le temps au composant de monter
    const timer = setTimeout(prefetchCriticalData, 100);

    return () => clearTimeout(timer);
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}