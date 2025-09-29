import React, { useEffect, useState } from 'react';
import WorldMap from 'react-world-map';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const geoUrl = 'https://raw.githubusercontent.com/deldersveld/topojson/master/world-countries.json';

import { 
  getGlobalTotalCases, 
  getGlobalTotalDeaths, 
  get28DayCases, 
  get28DayDeaths, 
  getTotalVaccineDoses,
  getTotalVaccineDosesPerCountry, 
  get28DayVaccineDoses,
  get28DayVaccineDosesPerCountry,
  getTotalCasesPerCountry,
  getTotalDeathsPerCountry,
  get28DayCasesPerCountry,
  get28DayDeathsPerCountry
} from '../../services/api';
import './Dashboard.css';

const Dashboard = ({ style }) => {
  const [totalCases, setTotalCases] = useState(null);
  const [totalDeaths, setTotalDeaths] = useState(null);
  const [casesLoading, setCasesLoading] = useState(true);
  const [deathsLoading, setDeathsLoading] = useState(true);
  const [casesError, setCasesError] = useState('');
  const [deathsError, setDeathsError] = useState('');

  const [cases28Day, setCases28Day] = useState(null);
  const [cases28DayLoading, setCases28DayLoading] = useState(true);
  const [cases28DayError, setCases28DayError] = useState('');

  const [deaths28Day, setDeaths28Day] = useState(null);
  const [deaths28DayLoading, setDeaths28DayLoading] = useState(true);
  const [deaths28DayError, setDeaths28DayError] = useState('');

  const [totalVaccineDoses, setTotalVaccineDoses] = useState(null);
  const [vaccineDosesLoading, setVaccineDosesLoading] = useState(true);
  const [vaccineDosesError, setVaccineDosesError] = useState('');

  const [totalVaccineDosesPerCountry, setTotalVaccineDosesPerCountry] = useState(null);
  const [vaccineDosesPerCountryLoading, setVaccineDosesPerCountryLoading] = useState(true);
  const [vaccineDosesPerCountryError, setVaccineDosesPerCountryError] = useState('');

  const [vaccineDoses28Day, setVaccineDoses28Day] = useState(null);
  const [vaccineDoses28DayLoading, setVaccineDoses28DayLoading] = useState(true);
  const [vaccineDoses28DayError, setVaccineDoses28DayError] = useState('');

  const [vaccineDoses28DayPerCountry, setVaccineDoses28DayPerCountry] = useState(null);
  const [vaccineDoses28DayPerCountryLoading, setVaccineDoses28DayPerCountryLoading] = useState(true);
  const [vaccineDoses28DayPerCountryError, setVaccineDoses28DayPerCountryError] = useState('');

  const [countryCases, setCountryCases] = useState([]);
  const [countryCasesLoading, setCountryCasesLoading] = useState(true);
  const [countryCasesError, setCountryCasesError] = useState('');

  const [totalCasesPerCountry, setTotalCasesPerCountry] = useState([]);
  const [totalCasesPerCountryLoading, setTotalCasesPerCountryLoading] = useState(true);
  const [totalCasesPerCountryError, setTotalCasesPerCountryError] = useState('');

  const [totalDeathsPerCountry, setTotalDeathsPerCountry] = useState([]);
  const [totalDeathsPerCountryLoading, setTotalDeathsPerCountryLoading] = useState(true);
  const [totalDeathsPerCountryError, setTotalDeathsPerCountryError] = useState('');

  const [cases28DayPerCountry, setCases28DayPerCountry] = useState(null);
  const [cases28DayPerCountryLoading, setCases28DayPerCountryLoading] = useState(true);
  const [cases28DayPerCountryError, setCases28DayPerCountryError] = useState('');

  const [deaths28DayPerCountry, setDeaths28DayPerCountry] = useState(null);
  const [deaths28DayPerCountryLoading, setDeaths28DayPerCountryLoading] = useState(true);
  const [deaths28DayPerCountryError, setDeaths28DayPerCountryError] = useState('');

  const [searchTerm, setSearchTerm] = useState("");

  const [selectedCountry, setSelectedCountry] = useState(null);
  
  const data1 = [
    { week: '2022', cases: 6000000 },
  ];

  const formatYAxis = (tick) => {
    if (tick >= 1000000) {
      return `${tick / 1000000}M`;
    }
    return tick;
  };

  const data2 = [
    { week: 'Week 1', deaths: 30 },
    { week: 'Week 2', deaths: 50 },
    { week: 'Week 3', deaths: 45 },
  ];

  const data3 = [
    { week: 'Week 1', recovered: 800 },
    { week: 'Week 2', recovered: 1200 },
    { week: 'Week 3', recovered: 1000 },
  ];

  const filteredCountries = totalCasesPerCountry.filter((country) =>
    country.country.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCountryClick = (countryName) => {
    setSelectedCountry(countryName);
  };

  useEffect(() => {
    const fetchTotalCases = async () => {
      try {
        const data = await getGlobalTotalCases();
        setTotalCases(data.total_cases);
      } catch (error) {
        console.error('Error fetching total cases:', error);
        setCasesError('Failed to fetch total cases.');
      } finally {
        setCasesLoading(false);
      }
    };
    fetchTotalCases();
  }, []);

  useEffect(() => {
    const fetchTotalDeaths = async () => {
      try {
        const data = await getGlobalTotalDeaths();
        setTotalDeaths(data.total_deaths);
      } catch (error) {
        console.error('Error fetching total deaths:', error);
        setDeathsError('Failed to fetch total deaths.');
      } finally {
        setDeathsLoading(false);
      }
    };
    fetchTotalDeaths();
  }, []);

  useEffect(() => {
    const fetch28DayCases = async () => {
      try {
        const data = await get28DayCases();
        setCases28Day(data.total_28_day_cases);
      } catch (error) {
        console.error('Error fetching 28-day cases:', error);
        setCases28DayError('Failed to fetch 28-day cases.');
      } finally {
        setCases28DayLoading(false);
      }
    };
    fetch28DayCases();
  }, []);

  useEffect(() => {
    const fetch28DayCasesPerCountry = async () => {
      try {
        const data = await get28DayCasesPerCountry();
        console.log('Fetched 28-Day Cases Per Country:', data); // debugging
        setCases28DayPerCountry(data.total_28_day_cases_per_country);
      } catch (error) {
        console.error('Error fetching 28-day cases per country:', error);
        setCases28DayPerCountryError('Failed to fetch 28-day cases.');
      } finally {
        setCases28DayPerCountryLoading(false);
      }
    };
    fetch28DayCasesPerCountry();
  }, []);

  useEffect(() => {
    const fetch28DayDeaths = async () => {
      try {
        const data = await get28DayDeaths();
        console.log('Fetched 28-Day Deaths Data:', data);
        setDeaths28Day(data.total_28_day_deaths);
      } catch (error) {
        console.error('Error fetching 28-day deaths:', error);
        setDeaths28DayError('Failed to fetch 28-day deaths.');
      } finally {
        setDeaths28DayLoading(false);
      }
    };
    fetch28DayDeaths();
  }, []);

  useEffect(() => {
    const fetch28DayDeathsPerCountry = async () => {
      try {
        const data = await get28DayDeathsPerCountry();
        console.log('Fetched 28-Day Deaths Per Country:', data); // debugging
        setDeaths28DayPerCountry(data.total_28_day_deaths_per_country);
      } catch (error) {
        console.error('Error fetching 28-day deaths per country:', error);
        setDeaths28DayPerCountryError('Failed to fetch 28-day deaths per country.');
      } finally {
        setDeaths28DayPerCountryLoading(false);
      }
    };
    fetch28DayDeathsPerCountry();
  }, []);  

  useEffect(() => {
    const fetchTotalVaccineDoses = async () => {
      try {
        const data = await getTotalVaccineDoses();
        setTotalVaccineDoses(data.total_vaccine_doses);
      } catch (error) {
        console.error('Error fetching total vaccine doses:', error);
        setVaccineDosesError('Failed to fetch total vaccine doses.');
      } finally {
        setVaccineDosesLoading(false);
      }
    };
    fetchTotalVaccineDoses();
  }, []);

  useEffect(() => {
    const fetchTotalVaccineDosesPerCountry = async () => {
      try {
        const data = await getTotalVaccineDosesPerCountry();
        setTotalVaccineDosesPerCountry(data?.data || []);
      } catch (error) {
        console.error('Error fetching vaccine doses per country:', error);
        setVaccineDosesPerCountryError('Failed to fetch vaccine doses per country.');
      } finally {
        setVaccineDosesPerCountryLoading(false);
      }
    };
    
    fetchTotalVaccineDosesPerCountry();
  }, []);

  useEffect(() => {
    const fetch28DayVaccineDoses = async () => {
      try {
        const data = await get28DayVaccineDoses();
        setVaccineDoses28Day(data.total_28_day_vaccine_doses);
      } catch (error) {
        console.error('Error fetching 28-day vaccine doses:', error);
        setVaccineDoses28DayError('Failed to fetch 28-day vaccine doses.');
      } finally {
        setVaccineDoses28DayLoading(false);
      }
    };
    fetch28DayVaccineDoses();
  }, []);

  useEffect(() => {
    const fetch28DayVaccineDosesPerCountry = async () => {
      try {
        const data = await get28DayVaccineDosesPerCountry();
        setVaccineDoses28DayPerCountry(data.total_28_day_vaccine_doses);
      } catch (error) {
        console.error('Error fetching 28-day vaccine doses per country:', error);
        setVaccineDoses28DayPerCountryError('Failed to fetch 28-day vaccine doses per country.');
      } finally {
        setVaccineDoses28DayPerCountryLoading(false);
      }
    };
    fetch28DayVaccineDosesPerCountry();
  }, []);

  useEffect(() => {
    const fetchTotalCasesPerCountry = async () => {
      try {
        const data = await getTotalCasesPerCountry();
        setTotalCasesPerCountry(data?.data || []);
      } catch (error) {
        console.error('Error fetching total cases per country:', error);
        setTotalCasesPerCountryError('Failed to fetch total cases per country.');
      } finally {
        setTotalCasesPerCountryLoading(false);
      }
    };
    fetchTotalCasesPerCountry();
  }, []);

  useEffect(() => {
    const fetchTotalDeathsPerCountry = async () => {
      try {
        const data = await getTotalDeathsPerCountry();
        setTotalDeathsPerCountry(data?.data || []);
      } catch (error) {
        console.error('Error fetching total deaths per country:', error);
        setTotalDeathsPerCountryError('Failed to fetch total deaths per country.');
      } finally {
        setTotalDeathsPerCountryLoading(false);
      }
    };
    fetchTotalDeathsPerCountry();
  }, []);

  return (
    <div className="dashboard-wrapper">
        <div className="column">
            <div className="dashboard-container">
                <h3 className="small-text red-text">JHU Ceased Updates at:</h3>
                <p className="small-text white-text">3/10/2023, 2:21 PM</p>
                <p className="small-text red-text">See Terms of Use for more info</p>
            </div>
            <div className="cases-deaths-container">
  <h3 className="small-text">
    <span className="red-text">Cases</span> | Deaths by Country/Region/Sovereignty
  </h3>

  <input
    type="text"
    placeholder="Search by country name"
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="country-search-input"
  />

<div className="country-cases-deaths">
            {totalCasesPerCountryLoading || cases28DayPerCountryLoading ? (
              <p>Loading cases...</p>
            ) : totalCasesPerCountryError || cases28DayPerCountryError ? (
              <>
                {totalCasesPerCountryError && <p className="error-text">{totalCasesPerCountryError}</p>}
                {cases28DayPerCountryError && <p className="error-text">{cases28DayPerCountryError}</p>}
              </>
            ) : (
              Array.isArray(totalCasesPerCountry) &&
              totalCasesPerCountry.map((countryData) => {
                const country28DayData = cases28DayPerCountry?.find(
                  (data) => data.country === countryData.country
                );
                const countryDeaths28DayData = deaths28DayPerCountry?.find(
                  (data) => data.country === countryData.country
                );

                return (
                  <div 
                    key={countryData.country} 
                    className="country-data" 
                    onClick={() => handleCountryClick(countryData.country)} 
                    style={{ cursor: 'pointer', backgroundColor: selectedCountry === countryData.country ? '#ddd' : 'transparent' }}
                  >
                    <span className="country-name">{countryData.country}</span>
                    <br />
                    <span className="totals-label">Totals: </span>
                    <span className="case-count red-text">
                      {countryData.total_cases.toLocaleString()}
                    </span>
                    <span> | </span>
                    <span className="death-count">
                      {totalDeathsPerCountry?.find(deathData => deathData.country === countryData.country)?.total_deaths?.toLocaleString() || "N/A"}
                    </span>
                    <br />
                    <span className="totals-label">28-Day Cases: </span>
                    <span className="case-count red-text">
                      {country28DayData?.total_28_day_cases_per_country?.toLocaleString() || "N/A"}
                    </span>
                    <span> | </span>
                    <span className="death-count">
                      {countryDeaths28DayData?.total_28_day_deaths_per_country?.toLocaleString() || "N/A"}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
{/* <div className="country-cases-deaths">
  {totalCasesPerCountryLoading || cases28DayPerCountryLoading ? (
    <p>Loading cases...</p>
  ) : totalCasesPerCountryError || cases28DayPerCountryError ? (
    <>
      {totalCasesPerCountryError && <p className="error-text">{totalCasesPerCountryError}</p>}
      {cases28DayPerCountryError && <p className="error-text">{cases28DayPerCountryError}</p>}
    </>
  ) : (
    Array.isArray(totalCasesPerCountry) &&
    totalCasesPerCountry.map((countryData) => {
      const country28DayData = cases28DayPerCountry?.find(
        (data) => data.country === countryData.country
      );
      
      return (
        <div key={countryData.country} className="country-data">
          <span className="country-name">{countryData.country}</span>
          <br />
          <span className="totals-label">Totals: </span>
          <span className="case-count red-text">
            {countryData.total_cases.toLocaleString()}
          </span>
          <span> | </span>
          <span className="death-count">
            {totalDeathsPerCountry?.find(deathData => deathData.country === countryData.country)?.total_deaths?.toLocaleString() || "N/A"}
          </span>
          <br />
          <span className="totals-label">28-Day Cases: </span>
          <span className="case-count red-text">
            {country28DayData?.total_28_day_cases_per_country?.toLocaleString() || "N/A"}
          </span>
        </div>
      );
    })
  )}
</div> */}
        </div>

        <div className="column">
  <div className="total-cases-container">
    <h3 className="small-text">Total Cases</h3>
    <p className="small-text">
      {casesLoading
        ? 'Loading...'
        : casesError
        ? casesError
        : selectedCountry
        ? totalCasesPerCountry?.find((data) => data.country === selectedCountry)?.total_cases?.toLocaleString() || 'No data available'
        : totalCases !== null && totalCases !== undefined
        ? <span className="red-text">{totalCases.toLocaleString()}</span>
        : 'No data available'}
    </p>
  </div>
  <div className="cases-28-day-container">
    <h3 className="small-text">28-Day Cases</h3>
    <p className="small-text">
      {cases28DayLoading
        ? 'Loading...'
        : cases28DayError
        ? cases28DayError
        : selectedCountry
        ? cases28DayPerCountry?.find((data) => data.country === selectedCountry)?.total_28_day_cases_per_country?.toLocaleString() || 'No data available'
        : cases28Day !== null && cases28Day !== undefined
        ? <span className="red-text">{cases28Day.toLocaleString()}</span>
        : 'No data available'}
    </p>
  </div>
  {/* <div className="world-map-container">
    <WorldMap
      style={{ width: '100%', height: '300px' }}
      color="lightblue"
      highlightedCountries={selectedCountry ? [selectedCountry] : []}
    />
  </div> */}
    <div className="world-map-container">
      <MapContainer
        style={{ width: '100%', height: '300px' }}
        center={[51.505, -0.09]}
        zoom={2}
        scrollWheelZoom={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
        />
        
        <Marker position={[51.505, -0.09]}>
          <Popup>A sample popup for selected country!</Popup>
        </Marker>
      </MapContainer>
    </div>
    </div>
        {/* country names */}
        {/* {continents.map((continent, index) => (
            <Marker key={index} position={continent.position}>
              <Popup>{continent.name}</Popup>
            </Marker>
          ))}
        </div>
      </div> */}

<div className="column">
  <div className="total-deaths-container">
    <h3 className="small-text">Total Deaths</h3>
    <p className="small-text">
      {deathsLoading
        ? 'Loading...'
        : deathsError
        ? deathsError
        : selectedCountry
        ? totalDeathsPerCountry?.find((data) => data.country === selectedCountry)?.total_deaths?.toLocaleString() || 'No data available'
        : totalDeaths !== null && totalDeaths !== undefined
        ? totalDeaths.toLocaleString()
        : 'No data available'}
    </p>
  </div>
  <div className="deaths-28-day-container">
    <h3 className="small-text">28-Day Deaths</h3>
    <p className="small-text">
      {deaths28DayLoading
        ? 'Loading...'
        : deaths28DayError
        ? deaths28DayError
        : selectedCountry
        ? deaths28DayPerCountry?.find((data) => data.country === selectedCountry)?.total_28_day_deaths_per_country?.toLocaleString() || 'No data available'
        : deaths28Day !== null && deaths28Day !== undefined
        ? deaths28Day.toLocaleString()
        : 'No data available'}
    </p>
  </div>
</div>

<div className="column">
<div className="total-vaccine-doses-container">
  <h3 className="small-text">Total Vaccine Doses Administered</h3>
  <p className="small-text">
    {vaccineDosesLoading ? (
      'Loading...'
    ) : vaccineDosesError ? (
      vaccineDosesError
    ) : selectedCountry ? (
      totalVaccineDosesPerCountry?.[selectedCountry]?.total_vaccine_doses ? (
        <span className="green-text">
          {totalVaccineDosesPerCountry[selectedCountry].total_vaccine_doses.toLocaleString()}
        </span>
      ) : (
        'No data available'
      )
    ) : totalVaccineDoses !== null && totalVaccineDoses !== undefined ? (
      <span className="green-text">{totalVaccineDoses.toLocaleString()}</span>
    ) : (
      'No data available'
    )}
  </p>
</div>
<div className="vaccine-28-day-container">
  <h3 className="small-text">28-Day Vaccine Doses Administered</h3>
  <p className="small-text">
    {vaccineDoses28DayLoading
      ? 'Loading...'
      : vaccineDoses28DayError
      ? vaccineDoses28DayError
      : selectedCountry
      ? vaccineDoses28DayPerCountry?.[selectedCountry]?.total_28_day_vaccine_doses
        ? <span className="green-text">{vaccineDoses28DayPerCountry[selectedCountry].total_28_day_vaccine_doses.toLocaleString()}</span>
        : 'No data available for selected country'
      : vaccineDoses28Day !== null && vaccineDoses28Day !== undefined
      ? <span className="green-text">{vaccineDoses28Day.toLocaleString()}</span>
      : 'No data available'}
  </p>
</div>
<div className="weekly-cases-container">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data1}>
          <CartesianGrid strokeDasharray="3 3" />
          
          <XAxis dataKey="week" />
          
          <YAxis tickFormatter={formatYAxis} ticks={[0, 2000000, 4000000, 6000000]} />
          
          <Tooltip />
          <Legend />
          
          <Line type="monotone" dataKey="cases" stroke="#8884d8" />
        </LineChart>
      </ResponsiveContainer>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data2}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="deaths" stroke="#82ca9d" />
        </LineChart>
      </ResponsiveContainer>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data3}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="recovered" stroke="#ff7300" />
        </LineChart>
      </ResponsiveContainer>
</div>
</div>
    </div>
  );

};

export default Dashboard;