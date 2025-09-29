"use client";
import React, { useEffect, useState } from 'react';
import fetchCovidData from './utils/fetchData';
import Header from './components/Header';
import Dashboard from './components/Dashboard';

const Page = () => {
  const [data, setData] = useState([]);
  const [totalCases, setTotalCases] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingCases, setLoadingCases] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const url = 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv';
      const covidData = await fetchCovidData(url);
      setData(covidData);
      setLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchTotalCases = async () => {
      try {
        const response = await fetch('/api/get_total_cases');
        const result = await response.json();
        setTotalCases(result.totalCases);
      } catch (error) {
        console.error('Error fetching total cases:', error);
      } finally {
        setLoadingCases(false);
      }
    };
    fetchTotalCases();
  }, []);

  if (loading || loadingCases) return <div>Loading...</div>;

  return (
    <div>
      <Header />
      <Dashboard stats={data} totalCases={totalCases}  />
    </div>
  );
};

export default Page;
