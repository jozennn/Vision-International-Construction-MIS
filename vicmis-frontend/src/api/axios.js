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

// Call once before login — sets the HttpOnly session cookie and
// the readable XSRF-TOKEN cookie. Axios picks up XSRF-TOKEN
// automatically and sends it as X-XSRF-TOKEN on every request.
export async function initCsrf() {
  await axios.get(`${BASE}/sanctum/csrf-cookie`, { withCredentials: true });
}

// No interceptor needed to attach a token — the cookie is sent automatically.
// No sessionStorage, no localStorage, no Authorization header.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;