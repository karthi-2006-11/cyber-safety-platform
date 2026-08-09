import React from 'react';

export default function ProtectionStatusCard({ backendOnline }) {
  return (
    <div className="card">
      <div className="card-title">
        <span>Protection System Status</span>
        <span className={`badge ${backendOnline ? 'safe' : 'unknown'}`}>
          {backendOnline ? 'ACTIVE' : 'STANDBY'}
        </span>
      </div>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
        Background protection service monitors requested URLs via the browser extension layer.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '16px' }}>
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px' }}>
          <small style={{ color: 'var(--text-dim)', textTransform: 'uppercase' }}>Extension Listener</small>
          <div style={{ fontWeight: '600', marginTop: '2px', fontSize: '13px' }}>Manifest V3 Ready</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px' }}>
          <small style={{ color: 'var(--text-dim)', textTransform: 'uppercase' }}>Policy Enforcement</small>
          <div style={{ fontWeight: '600', marginTop: '2px', fontSize: '13px' }}>Standard Protocol</div>
        </div>
      </div>
    </div>
  );
}
