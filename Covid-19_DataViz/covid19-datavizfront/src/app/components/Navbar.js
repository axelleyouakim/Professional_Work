'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './Dashboard.css';

const Navbar = () => {
  const pathname = usePathname();
  const isCompare = pathname === '/compare';

  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '0 16px',
      height: '40px',
      background: '#0d1f2e',
      borderBottom: '1px solid #1e3a5f',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <Link
        href="/"
        style={{
          padding: '6px 14px',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: pathname === '/' ? '600' : '400',
          color: pathname === '/' ? '#fff' : '#7a9abc',
          background: pathname === '/' ? 'rgba(74,138,255,0.15)' : 'transparent',
          border: pathname === '/' ? '1px solid rgba(74,138,255,0.3)' : '1px solid transparent',
          textDecoration: 'none',
          transition: 'all 0.15s',
        }}
      >
        Dashboard
      </Link>

      <Link
        href="/compare"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 14px',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: isCompare ? '600' : '500',
          color: isCompare ? '#fff' : '#4a8aff',
          background: isCompare
            ? 'linear-gradient(135deg, #4a8aff, #2a5acc)'
            : 'rgba(74,138,255,0.08)',
          border: `1px solid ${isCompare ? 'transparent' : 'rgba(74,138,255,0.3)'}`,
          textDecoration: 'none',
          transition: 'all 0.15s',
          boxShadow: isCompare ? '0 2px 8px rgba(74,138,255,0.3)' : 'none',
        }}
      >
        Compare Countries
        <span style={{
          fontSize: '10px',
          background: 'rgba(255,255,255,0.2)',
          padding: '1px 5px',
          borderRadius: '10px',
          fontWeight: '600',
        }}>
          2–8
        </span>
      </Link>
    </nav>
  );
};

export default Navbar;