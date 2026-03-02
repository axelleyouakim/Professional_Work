'use client';

import React from 'react';
import Dashboard from './components/Dashboard';
import Header from './components/Header';
import './globals.css';

export default function HomePage() {
  return (
    <div className="app-container">
      <Header />
      <Dashboard />
    </div>
  );
}