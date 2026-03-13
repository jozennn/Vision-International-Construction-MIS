import React, { useState } from 'react';
import '../css/Construction.css';

const MaterialRequest = ({ onBack }) => {
  const [requests, setRequests] = useState([
    { id: 1, item: 'Office Chairs', requester: 'Admin Dept', qty: 5, urgency: 'High', date: '2023-11-01' }
  ]);

  return (
    <div className="construction-container">
      <div className="table-header-box">
        <div className="left-side">
          <button className="back-nav-btn" onClick={onBack}>← Back</button>
          <h2>Material Requests</h2>
        </div>
        <button className="add-material-btn">+ Create Request</button>
      </div>
      <div className="table-wrapper">
        <table className="construction-table">
          <thead>
            <tr>
              <th>Requested Item</th>
              <th>Requested By</th>
              <th>Qty</th>
              <th>Date</th>
              <th>Urgency</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map(r => (
              <tr key={r.id}>
                <td className="font-bold">{r.item}</td>
                <td>{r.requester}</td>
                <td>{r.qty}</td>
                <td>{r.date}</td>
                <td><span className={`status-badge ${r.urgency === 'High' ? 'low' : 'ok'}`}>{r.urgency}</span></td>
                <td className="action-btns">
                  <button className="edit-action">Approve</button>
                  <button className="delete-action">Decline</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MaterialRequest;