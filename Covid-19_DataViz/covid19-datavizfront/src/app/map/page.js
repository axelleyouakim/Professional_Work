"use client";
import React, { useEffect, useState, useRef } from 'react';
import Header from '../components/Header';
import Navbar from '../components/Navbar';
import { getTotalCasesPerCountry } from '../../services/api';
import * as d3 from 'd3';
import * as topojson from "topojson-client";
import './map.css';

const MapPage = () => {
  const canvasRef = useRef(null);
  const [worldData, setWorldData] = useState(null);
  const [totalCasesPerCountry, setTotalCasesPerCountry] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json')
      .then(response => response.json())
      .then(topology => {
        const countries = topojson.feature(topology, topology.objects.countries);
        countries.features.forEach(feature => {
          const centroid = d3.geoCentroid(feature);
          feature.properties.centroid = centroid;
        });
        setWorldData(countries);
      })
      .catch(err => console.error('Error loading map:', err));
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getTotalCasesPerCountry();
        setTotalCasesPerCountry(data?.data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!worldData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = canvas.offsetHeight;

    const projection = d3.geoMercator()
      .scale(width / (2 * Math.PI))
      .translate([width / 2, height / 2]);

    const path = d3.geoPath(projection, context);

    const draw = () => {
      context.clearRect(0, 0, width, height);
      
      context.fillStyle = '#0a1929';
      context.fillRect(0, 0, width, height);

      context.fillStyle = '#1a2f3f';
      context.strokeStyle = '#2a4a5f';
      context.lineWidth = 0.5;

      worldData.features.forEach(feature => {
        context.beginPath();
        path(feature);
        context.fill();
        context.stroke();
      });

      if (totalCasesPerCountry.length > 0) {
        const maxCases = Math.max(...totalCasesPerCountry.map(c => c.total_cases || 0));

        totalCasesPerCountry.forEach(countryData => {
          if (!countryData.total_cases || countryData.total_cases === 0) return;

          const feature = worldData.features.find(f => {
            const name = f.properties.name || f.properties.NAME || f.properties.admin || f.properties.ADMIN || '';
            return name.toLowerCase() === countryData.country.toLowerCase();
          });

          if (feature && feature.properties.centroid) {
            const coords = projection(feature.properties.centroid);
            
            if (coords) {
              const radius = Math.sqrt(countryData.total_cases / maxCases) * 40;

              context.shadowColor = 'rgba(255, 0, 0, 0.8)';
              context.shadowBlur = 10;
              context.fillStyle = 'rgba(255, 0, 0, 0.6)';
              context.beginPath();
              context.arc(coords[0], coords[1], Math.max(3, radius), 0, 2 * Math.PI);
              context.fill();
              
              context.strokeStyle = 'rgba(255, 100, 100, 0.8)';
              context.lineWidth = 1;
              context.stroke();
              context.shadowBlur = 0;
            }
          }
        });
      }
    };

    draw();

    const handleResize = () => {
      const newWidth = canvas.offsetWidth;
      const newHeight = canvas.offsetHeight;
      canvas.width = newWidth;
      canvas.height = newHeight;
      projection
        .scale(newWidth / (2 * Math.PI))
        .translate([newWidth / 2, newHeight / 2]);
      draw();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [worldData, totalCasesPerCountry]);

  return (
    <div>
      <Header />
      <Navbar />
      <div className="map-page-container">
        <h1 className="map-title">Global COVID-19 Map Visualization</h1>
        {loading ? (
          <div className="loading">Loading map data...</div>
        ) : (
          <div className="map-canvas-wrapper">
            <canvas ref={canvasRef} className="map-canvas" />
            <div className="map-legend">
              <div className="legend-item">
                <div className="legend-circle small"></div>
                <span>Low cases</span>
              </div>
              <div className="legend-item">
                <div className="legend-circle medium"></div>
                <span>Medium cases</span>
              </div>
              <div className="legend-item">
                <div className="legend-circle large"></div>
                <span>High cases</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapPage;