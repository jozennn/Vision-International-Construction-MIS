import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { 
  Users, 
  Clock, 
  Calendar as CalIcon, 
  Megaphone, 
  Bell, 
  UserMinus, 
  X, 
  Check, 
  Trash2, 
  RefreshCw 
} from 'lucide-react';
import api from '@/api/axios';
import toast from 'react-hot-toast';
import './HRDashboard.css';

const HRDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [stats, setStats] = useState({ 
    employees: 0, 
    attendance_rate: '0%', 
    lates_this_month: 0, 
    absences_this_month: 0,
    birthdays: [], 
    hiring_positions: [] 
  });
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [message, setMessage] = useState('');
  const [type, setType] = useState('holiday');
  const [lastSynced, setLastSynced] = useState(new Date());

  const currentMonthName = new Date().toLocaleDateString('en-US', { month: 'long' });

  // --- SKELETON COMPONENT ---
  const StatSkeleton = () => (
    <div className="hr-stat-card skeleton-card">
      <div className="stat-content">
        <div className="skeleton skeleton-text"></div>
        <div className="skeleton skeleton-value"></div>
      </div>
      <div className="skeleton skeleton-circle"></div>
    </div>
  );

  // --- DATA FETCHING ---
  const fetchDashboardData = async (silent = false) => {
    if (!silent) setLoading(true);
    setIsSyncing(true);
    try {
      const [res, reqRes] = await Promise.all([
        api.get('/hr/dashboard-stats'),
        api.get('/hr/employee-requests/pending')
      ]);
      setStats(res.data);
      setRequests(Array.isArray(reqRes.data) ? reqRes.data : []);
      setLastSynced(new Date());
      
      if (silent && !loading) {
        console.log("Background sync complete");
      }
    } catch (error) {
      console.error("Dashboard Load Error:", error);
      toast.error("Sync Failed: Connection issue.");
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  };

  // --- AUTO-REFRESH (30 SECONDS) ---
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // --- ACTIONS ---
  const handleAction = async (id, status) => {
    const loadingToast = toast.loading(`Setting status to ${status}...`);
    try {
      // Triggers the updateStatus method in PHP Controller
      const response = await api.put(`/hr/employee-requests/${id}`, { status });
      
      const successMsg = response.data.message || `Update Successful!`;
      
      toast.success(successMsg, {
        id: loadingToast,
        duration: 4000,
      });

      setSelectedRequest(null);
      // Refreshing stats here ensures the "Monthly Absences" card updates immediately
      fetchDashboardData(true); 
      
    } catch (err) {
      console.error("Update Error:", err.response);
      const errorMsg = err.response?.data?.error || "Update failed. Check connection.";
      toast.error(errorMsg, { id: loadingToast });
    }
  };

  const handleBroadcast = async () => {
    if (!message) return toast.error("Please enter a message.");
    try {
      const dateStr = new Date(selectedDate.getTime() - (selectedDate.getTimezoneOffset() * 60000))
        .toISOString().split('T')[0];
      await api.post('/hr/announcements', { event_date: dateStr, message, type });
      toast.success("Broadcast Live!");
      setMessage('');
    } catch (err) {
      toast.error("Broadcast failed.");
    }
  };

  return (
    <div className="hr-dashboard-container">
      <div className="hr-dashboard-header">
        <div className="hr-header-text">
          <h1>HR Executive Console</h1>
          <p>Vision Brand Management • {currentMonthName} {new Date().getFullYear()}</p>
        </div>
        <button className={`hr-sync-btn ${isSyncing ? 'syncing' : ''}`} onClick={() => fetchDashboardData()}>
          <RefreshCw size={16} className={isSyncing ? 'spin' : ''} />
          <span>Last Synced: {lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </button>
      </div>

      {/* STATS GRID */}
      <div className="hr-stats-grid">
        {loading ? (
          <>
            <StatSkeleton /> <StatSkeleton /> <StatSkeleton /> <StatSkeleton />
          </>
        ) : (
          <>
            <div className="hr-stat-card navy">
              <div className="stat-content">
                <span className="label">Total Personnel</span>
                <h2 className="value">{stats.employees}</h2>
              </div>
              <Users className="stat-icon" />
            </div>

            {/* UPDATED: Now shows Pending Requests count instead of percentage */}
            <div className="hr-stat-card blue">
              <div className="stat-content">
                <span className="label">Pending Requests</span>
                <h2 className="value">{requests.length}</h2>
              </div>
              <Bell className="stat-icon" />
            </div>

            {/* UPDATED: Displays Absences count from backend stats */}
            <div className="hr-stat-card red">
              <div className="stat-content">
                <span className="label">Monthly Absences</span>
                <h2 className="value">{stats.absences_this_month || 0}</h2>
              </div>
              <UserMinus className="stat-icon" />
            </div>

            <div className="hr-stat-card dark">
              <div className="stat-content">
                <span className="label">Monthly Lates</span>
                <h2 className="value">{stats.lates_this_month || 0}</h2>
              </div>
              <Clock className="stat-icon" />
            </div>
          </>
        )}
      </div>

      <div className="hr-content-layout">
        <div className="hr-column">
          <section className="hr-panel">
            <div className="panel-header"><Megaphone size={18} /><h3>Global Broadcaster</h3></div>
            <Calendar onChange={setSelectedDate} value={selectedDate} className="vision-calendar" />
            <div className="hr-broadcast-box">
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="holiday">Holiday Notice</option>
                <option value="event">Company Event</option>
              </select>
              <textarea placeholder="Type announcement..." value={message} onChange={(e) => setMessage(e.target.value)} />
              <button className="btn-vision-solid" onClick={handleBroadcast}>Broadcast Update</button>
            </div>
          </section>

          <section className="hr-panel mt-20">
            <div className="panel-header"><Bell size={18} /><h3>Pending Approvals ({requests.length})</h3></div>
            <div className="approval-list">
              {loading ? (
                <div className="skeleton skeleton-text" style={{width: '100%', height: '50px'}}></div>
              ) : (
                requests.map(req => (
                  <div key={req.id} className="mini-req-card">
                    <div className="req-info">
                      <strong>{req.user?.name}</strong>
                      <p>{req.type} — {req.reason.substring(0, 20)}...</p>
                    </div>
                    <button className="view-details-btn" onClick={() => setSelectedRequest(req)}>View</button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="hr-column">
          <section className="hr-panel">
            <div className="panel-header"><CalIcon size={18} /><h3>Birthdays</h3></div>
            <div className="info-list">
              {stats.birthdays?.length > 0 ? (
                stats.birthdays.map((b, i) => (
                  <div key={i} className="info-item">
                    <div className="info-icon-circle">🎂</div>
                    <div>
                      <p className="p-main">{b.name}</p>
                      <p className="p-sub">{b.date}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="p-sub" style={{padding: '10px'}}>No birthdays this month.</p>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* MODAL */}
      {selectedRequest && (
        <div className="modal-overlay">
          <div className="modal-content detail-modal">
            <div className="modal-header">
              <h3>Request Review</h3>
              <button className="close-x" onClick={() => setSelectedRequest(null)}><X size={20}/></button>
            </div>
            <div className="detail-body">
              <div className="detail-row">
                <span className="detail-label">Employee</span>
                <span className="detail-value">{selectedRequest.user?.name}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Type</span>
                <span className="detail-value badge-type">{selectedRequest.type}</span>
              </div>
              <div className="time-info-box">
                {selectedRequest.type?.toUpperCase() === 'OT' || selectedRequest.type?.toUpperCase() === 'OVERTIME' ? (
                  <>
                    <p>Date: {selectedRequest.date}</p>
                    <p>Time: {selectedRequest.start_time} - {selectedRequest.end_time}</p>
                  </>
                ) : (
                  <p>Period: {selectedRequest.start_date} to {selectedRequest.end_date}</p>
                )}
              </div>
              <div className="reason-container">
                <label>Reason</label>
                <div className="reason-bubble">"{selectedRequest.reason}"</div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-approve" onClick={() => handleAction(selectedRequest.id, 'approved')}>
                <Check size={18} /> Approve
              </button>
              <button className="btn-reject" onClick={() => handleAction(selectedRequest.id, 'rejected')}>
                <Trash2 size={18} /> Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRDashboard;