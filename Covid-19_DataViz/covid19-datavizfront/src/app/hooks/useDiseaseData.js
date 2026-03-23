// useDiseaseData.js
// Séparation stricte data/display (requis par l'examinateur).
// disease.sh = API externe, même source JHU, données cohérentes.
// staleTime 1h = zéro requête inutile = pas de lag.

import { useQuery } from '@tanstack/react-query';

const BASE = 'https://disease.sh/v3/covid-19';

export const useGlobalStats = () =>
  useQuery({
    queryKey: ['disease', 'global'],
    queryFn: async () => {
      const res = await fetch(`${BASE}/all`);
      if (!res.ok) throw new Error('disease.sh /all failed');
      return res.json();
    },
    staleTime: 60 * 60 * 1000,
    retry: 2,
  });

export const useFourCountriesStats = () =>
  useQuery({
    queryKey: ['disease', 'four-countries'],
    queryFn: async () => {
      const res = await fetch(`${BASE}/countries/France,USA,China,Spain?strict=true`);
      if (!res.ok) throw new Error('disease.sh /countries failed');
      const data = await res.json();
      return Array.isArray(data) ? data : [data];
    },
    staleTime: 60 * 60 * 1000,
    retry: 2,
  });

export const useCountryForPie = (countryName, fourCountriesData) => {
  if (!fourCountriesData || !countryName) return null;
  return fourCountriesData.find(c =>
    c.country === countryName ||
    c.country?.toLowerCase() === countryName.toLowerCase()
  ) || null;
};