import React from 'react';
import './Dashboard.css';

const LastUpdatedDisplay = ({ timestamp = "4/2/2020 9:02:01 AM" }) => {
  return (
    <div className="last-updated">
      <h4 className="update-label">Last Updated at (M/D/YYYY)</h4>
      <p className="update-time">{timestamp}</p>
    </div>
  );
};

export default LastUpdatedDisplay;