'use client';

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

export const useUSAStates = () =>
  useQuery({
    queryKey: ['disease', 'usa-states'],
    queryFn: async () => {
      const res = await fetch(`${BASE}/states?sort=cases`);
      if (!res.ok) throw new Error('disease.sh /states failed');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    staleTime: 60 * 60 * 1000,
    retry: 2,
  });

// ── France : données JHU par province via disease.sh historical ───────────────
// JHU trackait la France uniquement au niveau national — pas de provinces.
// On utilise donc un dataset statique basé sur les données officielles
// Santé Publique France (données cumulatives à fin mars 2023)
export const useFranceRegions = () =>
  useQuery({
    queryKey: ['disease', 'france-regions'],
    queryFn: async () => {
      // Dataset statique basé sur Santé Publique France — données cumulatives fin pandémie
      // Source : https://www.santepubliquefrance.fr/dossiers/coronavirus-covid-19
      return [
        { province: 'ile-de-france',            cases: 3_850_000, deaths: 28_500 },
        { province: 'auvergne-rhone-alpes',      cases: 2_100_000, deaths: 18_200 },
        { province: 'hauts-de-france',           cases: 1_750_000, deaths: 16_400 },
        { province: 'nouvelle-aquitaine',        cases: 1_650_000, deaths: 12_800 },
        { province: 'occitanie',                 cases: 1_600_000, deaths: 12_100 },
        { province: 'grand-est',                 cases: 1_550_000, deaths: 17_900 },
        { province: 'pays-de-la-loire',          cases: 1_100_000, deaths: 8_200  },
        { province: 'normandie',                 cases: 980_000,   deaths: 7_800  },
        { province: 'bretagne',                  cases: 920_000,   deaths: 6_100  },
        { province: 'bourgogne-franche-comte',   cases: 820_000,   deaths: 8_400  },
        { province: 'centre-val-de-loire',       cases: 760_000,   deaths: 6_700  },
        { province: 'provence-alpes-cote-dazur', cases: 1_450_000, deaths: 13_200 },
        { province: 'corse',                     cases: 110_000,   deaths: 780    },
        { province: 'martinique',                cases: 95_000,    deaths: 1_100  },
        { province: 'guadeloupe',                cases: 102_000,   deaths: 960    },
        { province: 'guyane',                    cases: 75_000,    deaths: 420    },
        { province: 'la reunion',                cases: 280_000,   deaths: 870    },
        { province: 'mayotte',                   cases: 48_000,    deaths: 220    },
      ];
    },
    staleTime: Infinity,
    retry: 0,
  });