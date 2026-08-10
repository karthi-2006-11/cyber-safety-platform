import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import LoginModal from './LoginModal';

export default function Header({ backendOnline }) {
  const { user, logout } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  return (
    <>
      <header className="header-bar">
        <div className="header-title">
          <h1>Background Protection Center</h1>
          <p>Real-Time Pre-Victim Cybercrime Mitigation</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="backend-indicator">
            <span className={`dot ${backendOnline ? 'online' : 'offline'}`}></span>
            <span>API: {backendOnline ? 'Connected' : 'Offline'}</span>
          </div>

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255, 255, 255, 0.05)', padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-main)', fontWeight: '600' }}>
                👤 {user.email} <small style={{ color: user.role === 'MODERATOR' ? '#10b981' : 'var(--accent-cyan)' }}>({user.role})</small>
              </span>
              <button
                onClick={logout}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              className="btn btn-primary"
              style={{ fontSize: '12px', padding: '6px 14px' }}
              onClick={() => setShowLoginModal(true)}
            >
              Sign In / Register
            </button>
          )}
        </div>
      </header>

      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </>
  );
}
