"use client";
import React from 'react';
import Header from './components/Header';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';

const Page = () => {
  return (
    <div>
      <Header />
      {/* <Navbar /> */}
      <Dashboard />
    </div>
  );
};

export default Page;