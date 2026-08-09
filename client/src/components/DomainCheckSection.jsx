import React, { useState } from 'react';

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
      const res = await fetch(`/api/v1/threats/check?domain=${encodeURIComponent(domainInput.trim())}`);
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
        <span>Domain Safety Inspection</span>
        <span>🔍</span>
      </div>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
        Query official database records for a target website domain.
      </p>

      <form onSubmit={handleCheck} className="search-box">
        <input
          type="text"
          className="input-field"
          placeholder="e.g. suspicious-example.com"
          value={domainInput}
          onChange={(e) => setDomainInput(e.target.value)}
        />
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Checking...' : 'Check Domain'}
        </button>
      </form>

      {error && (
        <div style={{ marginTop: '14px', color: 'var(--status-threat)', fontSize: '13px' }}>
          ⚠️ {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: '16px', padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '600' }}>{result.domain}</span>
            <span className={`badge ${result.status.toLowerCase()}`}>
              {result.status.replace(/_/g, ' ')}
            </span>
          </div>

          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '10px' }}>
            <p><strong>Source:</strong> {result.source}</p>
            {result.note && <p style={{ marginTop: '4px', fontStyle: 'italic' }}>{result.note}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
