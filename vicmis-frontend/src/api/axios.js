import axios from 'axios';

const BASE = 'https://visionintlconstopc.com';

const api = axios.create({
  baseURL: `${BASE}/api`,
  withCredentials: true, // sends laravel_session + XSRF-TOKEN cookie automatically
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Called once on app boot — writes the HttpOnly session cookie and
// the readable XSRF-TOKEN cookie. Axios reads XSRF-TOKEN automatically
// and sends it as X-XSRF-TOKEN on every subsequent mutating request.
export async function initCsrf() {
  await axios.get(`${BASE}/sanctum/csrf-cookie`, { withCredentials: true });
}

// ── Boot guard ────────────────────────────────────────────────────────────────
// While App.jsx is running restoreSession(), we suppress the interceptor's
// auto-redirect so it doesn't race ahead and send the user to /login before
// authReady is set. App.jsx controls the redirect itself after boot.
let suppressRedirect = false;
export const setSuppressRedirect = (val) => { suppressRedirect = val; };

// ── In-flight refresh state ───────────────────────────────────────────────────
// Prevents multiple simultaneous 401s from firing multiple /refresh calls.
// All requests that 401 while a refresh is in progress are queued and
// replayed together once the single refresh resolves.
let isRefreshing = false;
let failedQueue  = [];

const processQueue = (error) => {
  failedQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve()
  );
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // ── 419: CSRF token expired ───────────────────────────────────────────────
    // Re-fetch the CSRF cookie and retry the original request once.
    // Happens when the user sits idle on the login screen long enough
    // for the XSRF-TOKEN cookie to expire before they submit.
    if (error.response?.status === 419) {
      try {
        await axios.get(`${BASE}/sanctum/csrf-cookie`, { withCredentials: true });
        return api.request(originalRequest);
      } catch {
        // If retry also fails, fall through to normal error handling
      }
    }

    // ── 401: Unauthorized ─────────────────────────────────────────────────────
    if (error.response?.status === 401) {
      const url = originalRequest.url ?? '';

      // Never attempt a refresh for these endpoints — doing so creates an
      // infinite loop (/refresh 401 → try refresh → /refresh 401 → ...).
      const isAuthEndpoint =
        url.includes('/refresh') ||
        url.includes('/login')   ||
        url.includes('/verify-2fa');

      // Also skip if this request has already been retried once.
      if (originalRequest._retry || isAuthEndpoint) {
        // Only redirect if we are NOT in the boot sequence.
        // During boot, App.jsx handles the outcome itself.
        if (!suppressRedirect && !window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      // If a refresh is already running, queue this request and wait.
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api.request(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Re-init CSRF before refreshing — if the session expired, the
        // XSRF-TOKEN cookie likely expired too. Without this, POST /refresh
        // itself would get a 419 and silently fail inside this handler.
        await axios.get(`${BASE}/sanctum/csrf-cookie`, { withCredentials: true });

        // The HttpOnly refresh_token cookie is sent automatically.
        // Backend rotates it and restores the Laravel session.
        await api.post('/refresh');

        processQueue(null);
        return api.request(originalRequest); // replay the original request
      } catch (refreshError) {
        processQueue(refreshError);
        // Only redirect if we are NOT in the boot sequence.
        if (!suppressRedirect && !window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;