import axios from 'axios';

const BASE = 'https://visionintlconstopc.com';

const api = axios.create({
  baseURL: `${BASE}/api`,
  withCredentials: true, // sends laravel_session cookie + XSRF-TOKEN automatically
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Call once on app boot — sets the HttpOnly session cookie and
// the readable XSRF-TOKEN cookie. Axios picks up XSRF-TOKEN
// automatically and sends it as X-XSRF-TOKEN on every request.
export async function initCsrf() {
  await axios.get(`${BASE}/sanctum/csrf-cookie`, { withCredentials: true });
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // FIX: 419 = CSRF token expired or missing.
    // Refresh the CSRF cookie and retry the original request once.
    // This covers cases where the XSRF-TOKEN cookie expires mid-session
    // (e.g. user sits on the login screen for a long time before submitting).
    if (error.response?.status === 419) {
      try {
        await axios.get(`${BASE}/sanctum/csrf-cookie`, { withCredentials: true });
        return api.request(error.config);
      } catch {
        // If the retry also fails, fall through to normal error handling
      }
    }

    if (error.response?.status === 401) {
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;