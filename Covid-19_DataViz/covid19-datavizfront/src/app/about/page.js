// pas de refactorisation, pas d'api et contenu statique
"use client";
import React from 'react';
import Header from '../components/Header';
import Navbar from '../components/Navbar';
import './about.css';

const AboutPage = () => {
  return (
    <div>
      <Header />
      <Navbar />
      <div className="about-container">
        <h1 className="about-title">About This Dashboard</h1>
        
        <section className="about-section">
          <h2>Project Overview</h2>
          <p>
            This COVID-19 Dashboard provides real-time visualization and analysis of global 
            coronavirus data. Built with Next.js and React, it aggregates data from multiple 
            sources to present comprehensive statistics on cases, deaths, and recoveries worldwide.
          </p>
        </section>

        <section className="about-section">
          <h2>Data Sources</h2>
          <ul>
            <li>Johns Hopkins University CSSE COVID-19 Data Repository</li>
            <li>WHO (World Health Organization)</li>
            <li>CDC (Centers for Disease Control and Prevention)</li>
            <li>ECDC (European Centre for Disease Prevention and Control)</li>
          </ul>
        </section>

        <section className="about-section">
          <h2>Features</h2>
          <ul>
            <li><strong>Dashboard:</strong> Interactive overview with global statistics and country-specific data</li>
            <li><strong>Data Table:</strong> Searchable table view of all countries COVID-19 metrics</li>
            <li><strong>Charts:</strong> Time-series visualizations of case trends</li>
            <li><strong>Map View:</strong> Geographic visualization with interactive zoom controls</li>
          </ul>
        </section>

        <section className="about-section">
          <h2>Technology Stack</h2>
          <ul>
            <li>Frontend: Next.js 14, React 18</li>
            <li>Data Visualization: Recharts, D3.js, TopoJSON</li>
            <li>Styling: CSS3, Custom Components</li>
            <li>API: Custom REST endpoints with Axios</li>
          </ul>
        </section>

        <section className="about-section">
          <h2>Contact & Support</h2>
          <p>
            For questions, bug reports, or feature requests, please visit the 
            Johns Hopkins University CSSE website or check the GitHub repository.
          </p>
        </section>
      </div>
    </div>
  );
};

export default AboutPage;