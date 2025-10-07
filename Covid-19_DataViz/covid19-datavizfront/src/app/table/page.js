"use client";
import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import Navbar from '../components/Navbar';
import { getTotalCasesPerCountry, getTotalDeathsPerCountry, getTotalRecoveredPerCountry } from '../../services/api';
import './table.css';

const TablePage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const cases = await getTotalCasesPerCountry();
        const deaths = await getTotalDeathsPerCountry();
        const recovered = await getTotalRecoveredPerCountry();
        
        const combinedData = cases.data.map(country => {
          const deathData = deaths.data.find(d => d.country === country.country);
          const recoveredData = recovered.data.find(r => r.country === country.country);
          
          return {
            country: country.country,
            cases: country.total_cases,
            deaths: deathData?.total_deaths || 0,
            recovered: recoveredData?.total_recovered || 0
          };
        });
        
        setData(combinedData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const filteredData = data.filter(item =>
    item.country.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        
        {loading ? (
          <div className="loading">Loading data...</div>
        ) : (
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
              {filteredData.map((item, index) => (
                <tr key={index}>
                  <td>{item.country}</td>
                  <td className="cases">{item.cases?.toLocaleString() || 'N/A'}</td>
                  <td className="deaths">{item.deaths?.toLocaleString() || 'N/A'}</td>
                  <td className="recovered">{item.recovered?.toLocaleString() || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default TablePage;