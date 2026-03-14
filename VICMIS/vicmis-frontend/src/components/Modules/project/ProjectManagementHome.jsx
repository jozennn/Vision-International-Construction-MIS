import React, { useState, useEffect } from "react";
import axios from "axios";
import "../css/ProjectManagement.css"; 

const ProjectManagement = ({ onSelectProject }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProjects = async () => {
      const token = sessionStorage.getItem('token');
      if (!token) {
        setError("You are not authenticated.");
        setLoading(false);
        return;
      }

      try {
        // Fetch the projects from the backend we just fixed!
        const response = await axios.get("http://localhost:8000/api/projects", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProjects(response.data);
      } catch (err) {
        console.error("Error fetching projects:", err);
        setError("Failed to load projects. Please check your connection.");
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-xl font-black text-[#003049] animate-pulse">Loading Projects...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-xl font-bold text-red-600 mb-4">⚠️ {error}</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 border-b-2 pb-4" style={{ borderColor: '#e5e7eb' }}>
        <h2 className="text-3xl font-black" style={{ color: '#003049' }}>Active Projects</h2>
        <p className="text-gray-500 font-bold mt-2">Select a project to view its workflow and status.</p>
      </div>

      {projects.length === 0 ? (
        <div className="p-10 border-2 border-dashed rounded-xl text-center bg-gray-50" style={{ borderColor: '#cbd5e1' }}>
          <p className="text-xl font-bold text-gray-500">No active projects assigned to your department right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div 
              key={project.id} 
              className="bg-white p-6 rounded-xl shadow-md border-2 hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between"
              style={{ borderColor: '#e5e7eb', borderTop: '8px solid #c1121f' }}
              onClick={() => onSelectProject(project)} 
            >
              <div>
                <h3 className="text-xl font-black mb-2" style={{ color: '#003049' }}>{project.project_name}</h3>
                <p className="text-sm font-bold text-gray-500 mb-1">👤 Client: <span className="text-gray-800">{project.client_name}</span></p>
                <p className="text-sm font-bold text-gray-500 mb-4">📍 Location: <span className="text-gray-800">{project.location}</span></p>
              </div>
              
              <div className="mt-4 pt-4 border-t-2" style={{ borderColor: '#f1f5f9' }}>
                <p className="text-xs font-black uppercase tracking-wider text-gray-400 mb-1">Current Status</p>
                <span className="inline-block px-3 py-1 rounded-md text-sm font-black" style={{ backgroundColor: '#fdf0d5', color: '#c1121f' }}>
                  {project.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectManagement;