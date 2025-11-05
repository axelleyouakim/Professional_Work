import React, { useState, useEffect } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import './CountrySearch.css';

const CountrySearch = ({ onSearchChange, resultsCount }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300); // Debounce de 300ms

  // Appeler onSearchChange uniquement quand la valeur debouncée change
  useEffect(() => {
    onSearchChange(debouncedSearchTerm);
  }, [debouncedSearchTerm, onSearchChange]);

  const handleClear = () => {
    setSearchTerm('');
  };

  return (
    <div className="country-search">
      <div className="search-input-wrapper">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          className="search-input"
          placeholder="Search country..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button className="clear-btn" onClick={handleClear} title="Clear search">
            ✕
          </button>
        )}
      </div>
      {debouncedSearchTerm && (
        <p className="search-results-info">
          {resultsCount} {resultsCount === 1 ? 'result' : 'results'} found
        </p>
      )}
    </div>
  );
};

export default CountrySearch;