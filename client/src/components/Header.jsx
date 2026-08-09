import React from 'react';

export default function Header({ backendOnline }) {
  return (
    <header className="header-bar">
      <div className="header-title">
        <h1>Background Protection Center</h1>
        <p>Real-Time Pre-Victim Cybercrime Mitigation</p>
      </div>

      <div className="backend-indicator">
        <span className={`dot ${backendOnline ? 'online' : 'offline'}`}></span>
        <span>Backend API: {backendOnline ? 'Connected' : 'Offline / Reconnecting'}</span>
      </div>
    </header>
  );
}
