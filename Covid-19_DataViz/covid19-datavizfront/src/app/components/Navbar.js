// pas de refactorisation, gestion de la navbar avec liens actifs, navigation statique
"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './Navbar.css';

const Navbar = () => {
  const pathname = usePathname();
  
  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link href="/" className={`nav-link ${pathname === '/' ? 'active' : ''}`}>
          Dashboard
        </Link>
        <Link href="/table" className={`nav-link ${pathname === '/table' ? 'active' : ''}`}>
          Data Table
        </Link>
        <Link href="/charts" className={`nav-link ${pathname === '/charts' ? 'active' : ''}`}>
          Charts
        </Link>
        <Link href="/map" className={`nav-link ${pathname === '/map' ? 'active' : ''}`}>
          Map View
        </Link>
        <Link href="/about" className={`nav-link ${pathname === '/about' ? 'active' : ''}`}>
          About
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;