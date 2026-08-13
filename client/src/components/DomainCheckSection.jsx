import React, { useState } from 'react';
import EvidenceSection from './EvidenceSection';
import { API_BASE_URL } from '../config/api';

export default function DomainCheckSection() {
  const [domainInput, setDomainInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleCheck = async (e) => {
    e.preventDefault();
    if (!domainInput.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch(`${API_BASE_URL}/threats/check?domain=${encodeURIComponent(domainInput.trim())}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to check domain safety');
      }

      setResult(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-title">
        <span>Domain Threat Pipeline Analysis</span>
        <span>🔍</span>
      </div>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
        Run domain through threat analysis pipeline (Reputation, Google Web Risk, Community Reports, Wikipedia & Reddit).
      </p>

      <form onSubmit={handleCheck} className="search-box">
        <input
          type="text"
          className="input-field"
          placeholder="e.g. example.com or suspicious-domain.com"
          value={domainInput}
          onChange={(e) => setDomainInput(e.target.value)}
        />
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Analyzing...' : 'Analyze Domain'}
        </button>
      </form>

      {error && (
        <div style={{ marginTop: '14px', color: 'var(--status-threat)', fontSize: '13px' }}>
          ⚠️ {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '600', fontSize: '15px' }}>{result.domain}</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <span className={`badge ${result.classification.toLowerCase()}`}>
                {result.classification.replace(/_/g, ' ')}
              </span>
              <span className="badge unknown" style={{ background: 'rgba(255,255,255,0.05)' }}>
                RISK: {result.riskLevel}
              </span>
            </div>
          </div>

          <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '6px' }}>
            <div><strong>Confidence Score:</strong> {(result.confidence * 100).toFixed(0)}%</div>
            <div><strong>Analyzed At:</strong> {new Date(result.analyzedAt).toLocaleTimeString()}</div>
          </div>

          {result.reasons && result.reasons.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '600' }}>Analysis Reasons</div>
              <ul style={{ paddingLeft: '18px', fontSize: '12px', color: 'var(--text-main)', lineHeight: '1.6' }}>
                {result.reasons.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            </div>
          )}

          <EvidenceSection evidence={result.evidence} />
        </div>
      )}
    </div>
  );
}
