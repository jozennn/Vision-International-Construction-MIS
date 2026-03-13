import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  withCredentials: true, // MUST be true for Laravel Sanctum/Cookies
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

// Request Interceptor
api.interceptors.request.use((config) => {
    const token = sessionStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => Promise.reject(error));

// Optimized Response Interceptor
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const { response } = error;

        if (response && response.status === 401) {
            // Check if we are already on the login page to avoid loops
            if (!window.location.pathname.includes('/login')) {
                sessionStorage.clear();
                // Instead of window.location, you could also use a state-based redirect 
                // but this is the most reliable way to clear the React state entirely.
                window.location.href = '/login'; 
            }
        }
        return Promise.reject(error);
    }
);

export default api;