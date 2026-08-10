import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginModal({ isOpen, onClose }) {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (isRegister) {
        await register(email.trim(), password, name.trim());
      } else {
        await login(email.trim(), password);
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      zIndex: 9999,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '16px'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '420px', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>
            {isRegister ? 'Create Account' : 'Account Sign In'}
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div style={{
            marginBottom: '14px',
            padding: '10px 14px',
            borderRadius: '6px',
            fontSize: '13px',
            background: 'rgba(239, 68, 68, 0.15)',
            color: 'var(--status-threat)',
            border: '1px solid var(--status-threat)'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {isRegister && (
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Full Name</label>
              <input
                type="text"
                className="input-field"
                style={{ width: '100%' }}
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Email Address</label>
            <input
              type="email"
              className="input-field"
              style={{ width: '100%' }}
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Password (min 8 chars)</label>
            <input
              type="password"
              className="input-field"
              style={{ width: '100%' }}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }} disabled={submitting}>
            {submitting ? 'Authenticating...' : isRegister ? 'Register Account' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => { setIsRegister(!isRegister); setError(null); }}
            style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', fontWeight: '600', padding: 0 }}
          >
            {isRegister ? 'Sign In' : 'Create One'}
          </button>
        </div>
      </div>
    </div>
  );
}
