import { useState, useEffect } from 'react';

/**
 * Hook pour debouncer une valeur (éviter trop d'appels)
 * @param {*} value - La valeur à debouncer
 * @param {number} delay - Délai en ms (défaut: 500ms)
 * @returns {*} - La valeur debouncée
 */
export function useDebounce(value, delay = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;