import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import NoticeBanner from './components/NoticeBanner';
import ProtectionStatusCard from './components/ProtectionStatusCard';
import DomainCheckSection from './components/DomainCheckSection';
import ReportSubmitModal from './components/ReportSubmitModal';
import DecisionsTable from './components/DecisionsTable';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [backendOnline, setBackendOnline] = useState(false);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch('/api/v1/health');
        if (res.ok) {
          setBackendOnline(true);
        } else {
          setBackendOnline(false);
        }
      } catch (err) {
        setBackendOnline(false);
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="dashboard-layout">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="main-content">
        <Header backendOnline={backendOnline} />
        <NoticeBanner />

        {activeTab === 'dashboard' && (
          <>
            <div className="dashboard-grid">
              <ProtectionStatusCard backendOnline={backendOnline} />
              <DomainCheckSection />
            </div>
            <DecisionsTable />
          </>
        )}

        {activeTab === 'lookup' && (
          <div style={{ maxWidth: '640px' }}>
            <DomainCheckSection />
          </div>
        )}

        {activeTab === 'reports' && (
          <div style={{ maxWidth: '640px' }}>
            <ReportSubmitModal />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="card" style={{ maxWidth: '640px' }}>
            <div className="card-title">
              <span>System Settings & Environment</span>
              <span>⚙️</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Current client configuration parameters:
            </p>
            <ul style={{ fontSize: '13px', paddingLeft: '20px', color: 'var(--text-main)', lineHeight: '1.8' }}>
              <li><strong>Frontend:</strong> React 18 + Vite (Port 3000)</li>
              <li><strong>API Proxy Target:</strong> http://localhost:5000</li>
              <li><strong>Extension Target:</strong> Manifest V3 Engine</li>
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
