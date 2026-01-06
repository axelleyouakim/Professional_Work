"use client";
import React, { useState, useMemo } from 'react';
import Header from '../components/Header';
import Navbar from '../components/Navbar';
import { MultiQueryWrapper } from '../components/QueryStateWrapper';
import { 
  useTotalCasesPerCountry, 
  useTotalDeathsPerCountry, 
  useTotalRecoveredPerCountry 
} from '../hooks/useCovidData';
import './table.css';

const TablePage = () => {
  const [searchTerm, setSearchTerm] = useState('');

  // ✅ APPEL TANSTACK QUERY
  const casesQuery = useTotalCasesPerCountry();
  const deathsQuery = useTotalDeathsPerCountry();
  const recoveredQuery = useTotalRecoveredPerCountry();

  return (
    <div>
      <Header />
      <Navbar />
      <div className="table-container">
        <h1 className="table-title">COVID-19 Data by Country</h1>
        
        <input
          type="text"
          placeholder="Search country..."
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        
        <MultiQueryWrapper 
          queries={[casesQuery, deathsQuery, recoveredQuery]}
          loadingMessage="Loading data..."
          errorMessage="Failed to load data"
        >
          {(casesData, deathsData, recoveredData) => {
            // ✅ LOGIC MOVED INSIDE MultiQueryWrapper
            const combinedData = casesData.map(country => {
              const deathData = deathsData.find(d => d.country === country.country);
              const recoveredDataItem = recoveredData.find(r => r.country === country.country);
              
              return {
                country: country.country,
                cases: country.total_cases,
                deaths: deathData?.total_deaths || 0,
                recovered: recoveredDataItem?.total_recovered || 0
              };
            });

            const filteredData = searchTerm
              ? combinedData.filter(item =>
                  item.country.toLowerCase().includes(searchTerm.toLowerCase())
                )
              : combinedData;

            return (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Country</th>
                    <th>Total Cases</th>
                    <th>Total Deaths</th>
                    <th>Total Recovered</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                        {searchTerm ? 'No countries found' : 'No data available'}
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((item, index) => (
                      <tr key={index}>
                        <td>{item.country}</td>
                        <td className="cases">{item.cases?.toLocaleString() || 'N/A'}</td>
                        <td className="deaths">{item.deaths?.toLocaleString() || 'N/A'}</td>
                        <td className="recovered">{item.recovered?.toLocaleString() || 'N/A'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            );
          }}
        </MultiQueryWrapper>
      </div>
    </div>
  );
};

export default TablePage;