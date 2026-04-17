// import React, { useState, useEffect } from 'react';
// import { HardDrive, Cpu, Radio, Zap } from 'lucide-react';
// import api from '@/api/axios';

// const ServerMetricsCard = () => {
//   const [metrics, setMetrics] = useState({
//     activeSessions: 0,
//     cpuLoad: 0,
//     memoryUsage: 0,
//     status: 'fetching'
//   });

//   useEffect(() => {
//     // In a real scenario, this would fetch from a specific Laravel endpoint
//     // e.g., api.get('/admin/server-metrics')
//     const fetchMetrics = async () => {
//       try {
//         // MOCK DATA: Simulating an API call for demonstration
//         // Replace this block with your actual API call when ready
//         const mockResponse = {
//           activeSessions: Math.floor(Math.random() * 50) + 10, // 10-60 active users
//           cpuLoad: Math.floor(Math.random() * 40) + 20,       // 20-60% CPU
//           memoryUsage: Math.floor(Math.random() * 30) + 40,   // 40-70% RAM
//         };
        
//         setMetrics({
//           ...mockResponse,
//           status: 'online'
//         });
//       } catch (err) {
//         console.error("Failed to fetch server metrics", err);
//         setMetrics(prev => ({ ...prev, status: 'error' }));
//       }
//     };

//     fetchMetrics();
//     // Refresh metrics every 30 seconds
//     const interval = setInterval(fetchMetrics, 30000);
//     return () => clearInterval(interval);
//   }, []);

//   const getStatusColor = (value, thresholdWarning, thresholdCritical) => {
//     if (value >= thresholdCritical) return '#ef4444'; // Red
//     if (value >= thresholdWarning) return '#f59e0b';  // Yellow
//     return '#10b981'; // Green
//   };

//   if (metrics.status === 'fetching') {
//     return <div className="sa-kpi-card" style={{ justifyContent: 'center' }}>Loading metrics...</div>;
//   }

//   return (
//     <>
//       {/* Active Sessions KPI Card */}
//       <div className="sa-kpi-card" style={{ '--kpi-accent': '#8b5cf6' }}>
//         <div className="sa-kpi-icon" style={{ background: '#f3e8ff', color: '#8b5cf6' }}>
//           <Radio size={22} className="animate-pulse" />
//         </div>
//         <div className="sa-kpi-data">
//           <h3>{metrics.activeSessions}</h3>
//           <p>Active Sessions</p>
//           <p className="sa-kpi-note">Users currently logged in</p>
//         </div>
//       </div>

//       {/* Server Health Complex Card */}
//       <div className="sa-kpi-card" style={{ '--kpi-accent': '#0ea5e9', flexDirection: 'column', alignItems: 'stretch' }}>
//         <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
//             <div className="sa-kpi-icon" style={{ background: '#e0f2fe', color: '#0ea5e9', margin: 0, marginRight: '16px', width: '40px', height: '40px' }}>
//             <HardDrive size={18} />
//             </div>
//             <div>
//                 <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>Server Health</p>
//                 <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Live Resource Usage</p>
//             </div>
//         </div>

//         {/* CPU Bar */}
//         <div style={{ marginBottom: '8px' }}>
//           <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px', color: '#64748b' }}>
//             <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Cpu size={12} /> CPU Load</span>
//             <span style={{ fontWeight: 600, color: getStatusColor(metrics.cpuLoad, 70, 90) }}>{metrics.cpuLoad}%</span>
//           </div>
//           <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
//             <div style={{ 
//               height: '100%', 
//               width: `${metrics.cpuLoad}%`, 
//               background: getStatusColor(metrics.cpuLoad, 70, 90),
//               transition: 'width 1s ease-in-out'
//             }} />
//           </div>
//         </div>

//         {/* Memory Bar */}
//         <div>
//           <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px', color: '#64748b' }}>
//             <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Zap size={12} /> Memory Usage</span>
//             <span style={{ fontWeight: 600, color: getStatusColor(metrics.memoryUsage, 75, 90) }}>{metrics.memoryUsage}%</span>
//           </div>
//           <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
//             <div style={{ 
//               height: '100%', 
//               width: `${metrics.memoryUsage}%`, 
//               background: getStatusColor(metrics.memoryUsage, 75, 90),
//               transition: 'width 1s ease-in-out'
//             }} />
//           </div>
//         </div>
//       </div>
//     </>
//   );
// };

// export default ServerMetricsCard;