// pas de refactorisation, composant de sélection du niveau administratif avec boutons
import React from 'react';
import './Dashboard.css';

const AdminLevelSelector = ({ selectedLevel, onLevelChange }) => {
  const levels = ['admin0', 'admin1', 'admin2'];

  return (
    <div className="admin-level-buttons">
      {levels.map((level) => (
        <button
          key={level}
          className={`admin-btn ${selectedLevel === level ? "active" : ""}`}
          onClick={() => onLevelChange(level)}
        >
          {level.charAt(0).toUpperCase() + level.slice(1)}
        </button>
      ))}
    </div>
  );
};

export default AdminLevelSelector;