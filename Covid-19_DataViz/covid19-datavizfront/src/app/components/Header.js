import React, { useState, useRef, useEffect } from 'react';
import './Header.css';
import Image from 'next/image';

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleClickOutside = (event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header 
      aria-label="Header" 
      className="header-panel flex small" 
      style={{ 
        backgroundColor: '#222222',
        border: '1px solid #353535',
        margin: '0.2cm',
        padding: '0.1cm 0.2cm',
        height: 'auto',
      }}
    >
      <div className="flex-none flex flex-col self-center ms-4 bg-[#222222] p-2 rounded">
        <a
          target="_blank"
          rel="noopener noreferrer"
          className="logo-icon-btn small"
          href="https://systems.jhu.edu/research/public-health/ncov/"
        >
          <Image
            src="/johns_hopkins_university_logo_transparent.png"
            alt="Johns Hopkins University Logo"
            width={30}
            height={29}
          />
        </a>
      </div>

      <div style={{ marginLeft: '0.2cm', display: 'flex', alignItems: 'center' }}>
        <h1 style={{ color: '#bcb9ae', fontSize: "19px",
            fontWeight: "400",
            margin: "0",
            lineHeight: "1.2",
            whiteSpace: "nowrap",
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', }}>
          Coronavirus COVID-19 Global Cases by the Center for Systems Science and Engineering (CSSE) at Johns Hopkins University (JHU)
        </h1>
      </div>

      <div className="flex-grow"></div>

      <div className="flex-none flex flex-row self-center me-2 relative" ref={dropdownRef}>
        <button
          className="burger-button"
          onClick={toggleDropdown}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "40px",
            height: "40px",
            padding: 0,
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              width: "21px",
              height: "18px",
            }}
          >
            <span style={{ height: "2.01px", width: "100%", background: "#d8d8d8" }} />
            <span style={{ height: "2px", width: "100%", background: "#d8d8d8" }} />
            <span style={{ height: "2px", width: "100%", background: "#d8d8d8" }} />
          </div>
        </button>
        {isOpen && (
          <div className="dropdown-menu">
            <a href="https://systems.jhu.edu/" target="_blank" rel="noopener noreferrer" className="dropdown-item">
              JHU CSSE
            </a>
            <a href="https://arcgis.com/apps/opsdashboard/index.html#/85320e2ea5424dfaaa75ae62e5c06e61" target="_blank" rel="noopener noreferrer" className="dropdown-item">
              Mobile Version
            </a>
            <a href="https://systems.jhu.edu/research/public-health/ncov-model-2/" target="_blank" rel="noopener noreferrer" className="dropdown-item">
              Modeling COVID-19
            </a>
            <a href="https://coronavirus.jhu.edu/" target="_blank" rel="noopener noreferrer" className="dropdown-item">
              JHU COVID-19 Resource Center
            </a>
            <a href="https://engineering.jhu.edu/novel-coronavirus-information/support-covid-19-dashboard-team/" target="_blank" rel="noopener noreferrer" className="dropdown-item">
              Donate
            </a>
            <a href="https://github.com/CSSEGISandData/COVID-19" target="_blank" rel="noopener noreferrer" className="dropdown-item">
              Raw Data
            </a>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
