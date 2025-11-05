/**
 * Filtre les pays par terme de recherche
 * @param {Array} countries - Liste des pays [{country, total_cases, ...}, ...]
 * @param {string} searchTerm - Terme de recherche
 * @returns {Array} - Pays filtrés
 */
export function filterCountriesBySearch(countries, searchTerm) {
  if (!searchTerm || !countries) {
    return countries;
  }

  const term = searchTerm.toLowerCase().trim();
  return countries.filter((country) =>
    country.country.toLowerCase().includes(term)
  );
}

/**
 * Calcule les statistiques pour une période donnée
 * @param {Array} timeSeriesData - Données de série temporelle
 * @param {number|null} days - Nombre de jours
 * @returns {Object} - {total, increase, percentChange}
 */
export function calculatePeriodStats(timeSeriesData, days) {
  if (!timeSeriesData || timeSeriesData.length === 0) {
    return { total: 0, increase: 0, percentChange: 0 };
  }

  const filteredData = filterByPeriod(timeSeriesData, days);
  
  if (filteredData.length === 0) {
    return { total: 0, increase: 0, percentChange: 0 };
  }

  const latestCases = filteredData[filteredData.length - 1]?.cases || 0;
  const firstCases = filteredData[0]?.cases || 0;
  const increase = latestCases - firstCases;
  const percentChange = firstCases > 0 ? ((increase / firstCases) * 100).toFixed(2) : 0;

  return {
    total: latestCases,
    increase,
    percentChange
  };
}

/**
 * Trie les pays par total de cas (décroissant)
 * @param {Array} countries - Liste des pays
 * @param {string} sortBy - Champ de tri ('total_cases', 'total_deaths', etc.)
 * @returns {Array} - Pays triés
 */
export function sortCountries(countries, sortBy = 'total_cases') {
  if (!countries) return [];
  
  return [...countries].sort((a, b) => {
    const valueA = a[sortBy] || 0;
    const valueB = b[sortBy] || 0;
    return valueB - valueA;
  });
}

/**
 * Obtient le top N pays
 * @param {Array} countries - Liste des pays
 * @param {number} topN - Nombre de pays à retourner
 * @param {string} sortBy - Champ de tri
 * @returns {Array} - Top N pays
 */
export function getTopCountries(countries, topN = 10, sortBy = 'total_cases') {
  const sorted = sortCountries(countries, sortBy);
  return sorted.slice(0, topN);
}