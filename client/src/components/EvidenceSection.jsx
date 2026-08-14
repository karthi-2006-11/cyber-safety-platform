import React from 'react';

export default function EvidenceSection({ evidence = [] }) {
  if (!evidence || evidence.length === 0) {
    return (
      <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-dim)', fontStyle: 'italic' }}>
        Supporting evidence is currently unavailable for this domain query.
      </div>
    );
  }

  // Group evidence by source
  const grouped = {
    GOOGLE_WEB_RISK: evidence.filter(e => e.source === 'GOOGLE_WEB_RISK'),
    COMMUNITY_REPORT: evidence.filter(e => e.source === 'COMMUNITY_REPORT'),
    WIKIPEDIA: evidence.filter(e => e.source === 'WIKIPEDIA'),
    REDDIT: evidence.filter(e => e.source === 'REDDIT')
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SYSTEM_DETECTED':
        return <span className="badge high_confidence_threat">SYSTEM DETECTION</span>;
      case 'VERIFIED':
        return <span className="badge safe">VERIFIED</span>;
      case 'SUPPORTED':
        return <span className="badge suspicious">SUPPORTED</span>;
      case 'UNVERIFIED':
      case 'PENDING':
      default:
        return <span className="badge unknown">UNVERIFIED COMMUNITY REPORT</span>;
    }
  };

  return (
    <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
      <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '10px' }}>
        Why was this website flagged? (Supporting Evidence)
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Security Intelligence */}
        {grouped.GOOGLE_WEB_RISK.length > 0 && (
          <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--status-threat)', textTransform: 'uppercase', marginBottom: '6px' }}>
              🛡️ Security Intelligence (Google Web Risk)
            </div>
            {grouped.GOOGLE_WEB_RISK.map((item, idx) => (
              <div key={idx} style={{ fontSize: '12px', marginBottom: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{item.title}</strong>
                  {getStatusBadge(item.verificationStatus)}
                </div>
                <p style={{ color: 'var(--text-muted)', marginTop: '2px' }}>{item.excerpt}</p>
              </div>
            ))}
          </div>
        )}

        {/* Community Reports Evidence */}
        {grouped.COMMUNITY_REPORT.length > 0 && (
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--primary-cyan)', textTransform: 'uppercase', marginBottom: '6px' }}>
              👥 User-Submitted Reports & Proof
            </div>
            {grouped.COMMUNITY_REPORT.map((item, idx) => (
              <div key={idx} style={{ fontSize: '12px', marginBottom: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{item.title}</strong>
                  {getStatusBadge(item.verificationStatus)}
                </div>
                <p style={{ color: 'var(--text-muted)', marginTop: '2px' }}>{item.excerpt}</p>
              </div>
            ))}
          </div>
        )}

        {/* Wikipedia Evidence */}
        {grouped.WIKIPEDIA.length > 0 && (
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--primary-blue)', textTransform: 'uppercase', marginBottom: '6px' }}>
              🌐 Public Context (Wikipedia)
            </div>
            {grouped.WIKIPEDIA.map((item, idx) => (
              <div key={idx} style={{ fontSize: '12px', marginBottom: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-cyan)', fontWeight: '600', textDecoration: 'none', wordBreak: 'break-all', overflowWrap: 'anywhere' }}>
                    {item.title} ↗
                  </a>
                  {getStatusBadge(item.verificationStatus)}
                </div>
                <p style={{ color: 'var(--text-muted)', marginTop: '2px', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{item.excerpt}</p>
              </div>
            ))}
          </div>
        )}

        {/* Reddit Evidence */}
        {grouped.REDDIT.length > 0 && (
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#ff4500', textTransform: 'uppercase', marginBottom: '6px' }}>
              💬 Community Discussions (Reddit)
            </div>
            {grouped.REDDIT.map((item, idx) => (
              <div key={idx} style={{ fontSize: '12px', marginBottom: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color: '#ff4500', fontWeight: '600', textDecoration: 'none', wordBreak: 'break-all', overflowWrap: 'anywhere' }}>
                    {item.title} ↗
                  </a>
                  {getStatusBadge(item.verificationStatus)}
                </div>
                <p style={{ color: 'var(--text-muted)', marginTop: '2px', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{item.excerpt}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
