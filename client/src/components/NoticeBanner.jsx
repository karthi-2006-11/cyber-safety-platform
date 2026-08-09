import React from 'react';

export default function NoticeBanner() {
  return (
    <div className="notice-card">
      <span style={{ fontSize: '18px' }}>ℹ️</span>
      <div>
        <strong>Phase 1 Architecture Foundation Notice:</strong>
        <p style={{ marginTop: '4px' }}>
          Threat classification engine, automatic blocking execution, and third-party evidence ingestion (Wikipedia & Reddit integration) are currently set to <em>PLANNED</em>. No synthetic or fake threat scores are generated.
        </p>
      </div>
    </div>
  );
}
