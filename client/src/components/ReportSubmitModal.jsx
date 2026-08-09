import React, { useState } from 'react';

export default function ReportSubmitModal() {
  const [domain, setDomain] = useState('');
  const [category, setCategory] = useState('PHISHING');
  const [description, setDescription] = useState('');
  const [evidenceText, setEvidenceText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!domain.trim() || !description.trim()) return;

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/v1/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: domain.trim(),
          category,
          description: description.trim(),
          evidenceText: evidenceText.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit report');
      }

      setMessage({ type: 'success', text: `Report submitted successfully! Storage: ${data.data.persistedTo}` });
      setDomain('');
      setDescription('');
      setEvidenceText('');
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card">
      <div className="card-title">
        <span>Submit Website Feedback & Proof</span>
        <span>📝</span>
      </div>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
        Experienced an issue with a domain? Submit reports and supporting evidence for investigation.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Target Domain / URL *</label>
          <input
            type="text"
            className="input-field"
            style={{ width: '100%' }}
            placeholder="e.g. deceptive-site.com"
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
            <option value="SUSPICIOUS">Deceptive / Misleading Behavior</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Detailed Description *</label>
          <textarea
            className="input-field"
            rows="3"
            style={{ width: '100%', resize: 'vertical' }}
            placeholder="Describe what occurred when visiting this website..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        <div>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Supporting Evidence / Proof (Optional Text/URL)</label>
          <textarea
            className="input-field"
            rows="2"
            style={{ width: '100%', resize: 'vertical' }}
            placeholder="Add relevant URL references or textual evidence..."
            value={evidenceText}
            onChange={(e) => setEvidenceText(e.target.value)}
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
          background: message.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: message.type === 'success' ? 'var(--status-safe)' : 'var(--status-threat)',
          border: `1px solid ${message.type === 'success' ? 'var(--status-safe)' : 'var(--status-threat)'}`
        }}>
          {message.text}
        </div>
      )}
    </div>
  );
}
