import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function ReportSubmitModal() {
  const { authHeaders, user } = useAuth();
  const [domain, setDomain] = useState('');
  const [category, setCategory] = useState('PHISHING');
  const [description, setDescription] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceTitle, setEvidenceTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [myReports, setMyReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);

  const fetchMyReports = async () => {
    setLoadingReports(true);
    try {
      const res = await fetch('/api/v1/reports/my-reports', {
        headers: { ...authHeaders() }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) setMyReports(json.reports || []);
      }
    } catch (err) {
      console.warn('Could not fetch user reports:', err);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    fetchMyReports();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!domain.trim() || !description.trim()) return;

    setSubmitting(true);
    setMessage(null);

    const evidenceList = [];
    if (evidenceUrl.trim()) {
      evidenceList.push({
        type: 'PUBLIC_URL',
        title: evidenceTitle.trim() || 'Public Reference URL',
        url: evidenceUrl.trim(),
        content: description.trim()
      });
    }

    try {
      const res = await fetch('/api/v1/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify({
          domain: domain.trim(),
          category,
          description: description.trim(),
          evidenceList
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to submit report');
      }

      if (data.isDuplicate) {
        setMessage({ type: 'warning', text: 'You have already submitted a report for this domain. Status is recorded.' });
      } else {
        setMessage({ type: 'success', text: `Report submitted successfully! Status: ${data.report.status}` });
        setDomain('');
        setDescription('');
        setEvidenceUrl('');
        setEvidenceTitle('');
        fetchMyReports();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="card">
        <div className="card-title">
          <span>Submit Community Cybercrime Report</span>
          <span>📝</span>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Encountered a suspicious or malicious domain? Submit a safety report and evidence references for moderator evaluation.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Target Domain / URL *</label>
            <input
              type="text"
              className="input-field"
              style={{ width: '100%' }}
              placeholder="e.g. suspicious-site.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Threat Category *</label>
            <select
              className="input-field"
              style={{ width: '100%' }}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="PHISHING">Phishing / Credential Theft</option>
              <option value="MALWARE">Malware / Ransomware Distribution</option>
              <option value="SCAM">Financial Fraud / E-Commerce Scam</option>
              <option value="DECEPTIVE_CONTENT">Deceptive / Misleading Behavior</option>
              <option value="OTHER">Other Security Threat</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Detailed Incident Description *</label>
            <textarea
              className="input-field"
              rows="3"
              style={{ width: '100%', resize: 'vertical' }}
              placeholder="Describe the deceptive behavior, prompt, or scam observed..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Supporting Evidence Title (Optional)</label>
            <input
              type="text"
              className="input-field"
              style={{ width: '100%', marginBottom: '8px' }}
              placeholder="e.g. Phishing Advisory Link"
              value={evidenceTitle}
              onChange={(e) => setEvidenceTitle(e.target.value)}
            />
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Public Reference URL (Optional)</label>
            <input
              type="url"
              className="input-field"
              style={{ width: '100%' }}
              placeholder="https://..."
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }} disabled={submitting}>
            {submitting ? 'Submitting Report...' : 'Submit Report'}
          </button>
        </form>

        {message && (
          <div style={{
            marginTop: '14px',
            padding: '10px 14px',
            borderRadius: '6px',
            fontSize: '13px',
            background: message.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : message.type === 'warning' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            color: message.type === 'success' ? 'var(--status-safe)' : message.type === 'warning' ? '#f59e0b' : 'var(--status-threat)',
            border: `1px solid ${message.type === 'success' ? 'var(--status-safe)' : message.type === 'warning' ? '#f59e0b' : 'var(--status-threat)'}`
          }}>
            {message.text}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">
          <span>My Submitted Reports & Status</span>
          <span>📋</span>
        </div>
        {loadingReports ? (
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Loading reports...</p>
        ) : myReports.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No reports submitted yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {myReports.map(rep => (
              <div key={rep.id} style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '10px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--accent-cyan)' }}>{rep.domain}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Category: {rep.category} &bull; {new Date(rep.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <span className={`badge ${rep.status ? rep.status.toLowerCase() : 'pending'}`} style={{
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '700',
                  border: '1px solid currentColor'
                }}>
                  {rep.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
