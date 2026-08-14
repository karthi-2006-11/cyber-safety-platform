import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config/api';

export default function ModeratorDashboard() {
  const { user, authHeaders, login, register } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  const fetchModerationReports = async () => {
    setLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/moderation/reports`, {
        headers: { ...authHeaders() }
      });

      const data = await res.json();
      if (res.status === 401 || res.status === 403) {
        setReports([]);
        setActionMessage({
          type: 'error',
          text: `HTTP ${res.status} ${data.error}: ${data.message || 'Moderator authorization required.'}`
        });
        return;
      }

      if (res.ok && data.success) {
        setReports(data.reports || []);
      } else {
        throw new Error(data.message || 'Failed to load moderation queue');
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModerationReports();
  }, [user]);

  const handleAction = async (reportId, actionType) => {
    setActionMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/moderation/reports/${reportId}/${actionType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify({ notes: `Actioned via Moderator Portal (${actionType})` })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Moderation action failed');
      }

      setActionMessage({
        type: 'success',
        text: `Action "${actionType.toUpperCase()}" applied to report #${reportId}. ${data.websiteStatus ? `Website status: ${data.websiteStatus}` : ''}`
      });

      fetchModerationReports();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const [modEmail, setModEmail] = useState('mod@cybersafety.local');
  const [modPassword, setModPassword] = useState('');

  const handleModeratorLogin = async (e) => {
    e.preventDefault();
    if (!modEmail.trim() || !modPassword) return;
    setActionMessage(null);
    try {
      await login(modEmail.trim(), modPassword);
      setModPassword('');
    } catch (err) {
      setActionMessage({ type: 'error', text: `Authentication failed: ${err.message}` });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="card-title" style={{ margin: 0 }}>
            <span>Moderator & Analyst Review Portal</span>
            <span>🛡️</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Auth Account:</span>
            <span style={{ fontSize: '11px', fontWeight: '700', color: (user?.role === 'MODERATOR' || user?.role === 'ADMIN') ? '#10b981' : '#ef4444' }}>
              {user ? `${user.email} (${user.role})` : 'UNAUTHENTICATED'}
            </span>
          </div>
        </div>

        {(!user || (user.role !== 'MODERATOR' && user.role !== 'ADMIN')) && (
          <form onSubmit={handleModeratorLogin} style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: '6px', margin: '14px 0', border: '1px solid var(--border-color)', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', width: '100%' }}>Moderator Authentication Required:</span>
            <input
              type="email"
              className="input-field"
              style={{ flex: 1, minWidth: '180px', padding: '6px 10px', fontSize: '12px' }}
              placeholder="Moderator Email"
              value={modEmail}
              onChange={(e) => setModEmail(e.target.value)}
              required
            />
            <input
              type="password"
              className="input-field"
              style={{ flex: 1, minWidth: '160px', padding: '6px 10px', fontSize: '12px' }}
              placeholder="Password"
              value={modPassword}
              onChange={(e) => setModPassword(e.target.value)}
              required
            />
            <button type="submit" className="btn btn-primary" style={{ fontSize: '12px', padding: '6px 14px' }}>
              Authenticate
            </button>
          </form>
        )}

        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Review pending community reports, inspect evidence, and action confirmed cyber threats for automatic browser blocking synchronization.
        </p>

        {actionMessage && (
          <div style={{
            marginBottom: '16px',
            padding: '10px 14px',
            borderRadius: '6px',
            fontSize: '13px',
            background: actionMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            color: actionMessage.type === 'success' ? 'var(--status-safe)' : 'var(--status-threat)',
            border: `1px solid ${actionMessage.type === 'success' ? 'var(--status-safe)' : 'var(--status-threat)'}`
          }}>
            {actionMessage.text}
          </div>
        )}

        {loading ? (
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Loading moderation queue...</p>
        ) : reports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)', fontSize: '13px' }}>
            {user && (user.role === 'MODERATOR' || user.role === 'ADMIN')
              ? 'No reports in moderation queue.'
              : 'Access restricted. Please authenticate as a MODERATOR account.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {reports.map(r => (
              <div key={r.id} style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '14px 16px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div>
                    <span style={{ fontWeight: '700', fontSize: '15px', color: 'var(--accent-cyan)' }}>{r.domain}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '10px' }}>
                      Category: <strong>{r.category}</strong>
                    </span>
                  </div>
                  <span className={`badge ${r.status ? r.status.toLowerCase() : 'pending'}`} style={{
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '700',
                    border: '1px solid currentColor'
                  }}>
                    {r.status}
                  </span>
                </div>

                <p style={{ fontSize: '13px', color: 'var(--text-main)', marginBottom: '10px', lineHeight: '1.4' }}>
                  "{r.description}"
                </p>

                {r.evidence && r.evidence.length > 0 && (
                  <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '8px 12px', borderRadius: '4px', marginBottom: '12px', fontSize: '12px' }}>
                    <div style={{ fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px' }}>Attached Evidence ({r.evidence.length}):</div>
                    {r.evidence.map(ev => (
                      <div key={ev.id} style={{ color: 'var(--text-main)', margin: '2px 0' }}>
                        &bull; [{ev.type}] {ev.title || 'Evidence'}: <em>{ev.content}</em> {ev.referenceUrl && `(${ev.referenceUrl})`}
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px dashed var(--border-color)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                    Reporter: {r.reporterHash} &bull; Submitted: {new Date(r.createdAt).toLocaleString()}
                  </span>

                  {r.status === 'PENDING' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn"
                        style={{ fontSize: '11px', padding: '5px 10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid #10b981' }}
                        onClick={() => handleAction(r.id, 'verify')}
                      >
                        Verify Report
                      </button>
                      <button
                        className="btn"
                        style={{ fontSize: '11px', padding: '5px 10px', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid #ef4444' }}
                        onClick={() => handleAction(r.id, 'action')}
                      >
                        Action & Promote Threat
                      </button>
                      <button
                        className="btn"
                        style={{ fontSize: '11px', padding: '5px 10px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}
                        onClick={() => handleAction(r.id, 'reject')}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
