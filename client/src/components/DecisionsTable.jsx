import React from 'react';

export default function DecisionsTable() {
  return (
    <div className="card" style={{ gridColumn: '1 / -1' }}>
      <div className="card-title">
        <span>Recent Security Decisions & Community Reports</span>
        <span>📋</span>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Domain</th>
              <th>Classification</th>
              <th>Category</th>
              <th>Evidence Source</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan="5" className="empty-state">
                No security decisions recorded yet in local database session.
                <br />
                <small style={{ color: 'var(--text-dim)' }}>
                  (Use Domain Lookup above or submit a report to test API records)
                </small>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
