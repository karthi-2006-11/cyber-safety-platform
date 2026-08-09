import React, { useState, useEffect } from 'react';

export default function ModeratorDashboard() {
  const [role, setRole] = useState('MODERATOR'); // Role toggle for testing RBAC
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  const fetchModerationReports = async () => {
    setLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/v1/moderation/reports', {
        headers: { 'x-user-role': role }
      });

      const data = await res.json();
      if (res.status === 403) {
        setReports([]);
        setActionMessage({ type: 'error', text: '403 Forbidden: Moderator authorization required.' });
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
  }, [role]);

  const handleAction = async (reportId, actionType) => {
    setActionMessage(null);
    try {
      const res = await fetch(`/api/v1/moderation/reports/${reportId}/${actionType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': role
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="card-title" style={{ margin: 0 }}>
            <span>Moderator & Analyst Review Portal</span>
            <span>🛡️</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Role Context:</span>
            <button
              className={`btn ${role === 'MODERATOR' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '11px', padding: '4px 10px' }}
              onClick={() => setRole(role === 'MODERATOR' ? 'USER' : 'MODERATOR')}
            >
              {role === 'MODERATOR' ? '🔑 MODERATOR' : '👤 NORMAL USER'}
            </button>
          </div>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '12px 0 16px 0' }}>
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
            {role === 'MODERATOR' ? 'No reports in moderation queue.' : 'Access restricted. Switch to MODERATOR role context.'}
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
