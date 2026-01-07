import type { User, Test, Attempt, Answer } from '@/types';

// Prefer explicit env, otherwise use same-origin '/api' (works with Vite proxy / deployments).
let API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '/api';

// If env provides full origin without '/api', normalize it.
if (API_BASE !== '/api' && !API_BASE.endsWith('/api')) {
  API_BASE = API_BASE.replace(/\/$/, '') + '/api';
}

// Simple token storage (localStorage) for JWT
const TOKEN_KEY = 'authToken';
export function setToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

async function request(path: string, opts: RequestInit = {}) {
  const method = (opts.method || 'GET').toUpperCase();
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(opts.headers as Record<string, string> || {}) };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Basic in-memory cache for GET requests (helps before query migration completes)
  // Note: react-query will supersede most of this.
  const cacheKey = `${method}:${API_BASE}${path}`;
  const canCache = method === 'GET' && !opts.body;
  const now = Date.now();

  if (canCache) {
    const hit = getCache.get(cacheKey);
    if (hit && hit.expiresAt > now) return hit.value;
  }

  const controller = new AbortController();
  const timeoutMs = typeof (opts as any).timeoutMs === 'number' ? (opts as any).timeoutMs : 20_000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...opts, credentials: 'omit', headers, signal: (opts as any).signal || controller.signal });
  } finally {
    clearTimeout(timeout);
  }

  const contentType = res.headers.get('content-type') || '';
  let body: any = null;
  try {
    if (contentType.includes('application/json')) body = await res.json();
    else body = await res.text();
  } catch (e) {
    body = null;
  }
  if (!res.ok) {
    const err = new Error(body?.error || res.statusText || 'Request failed');
    (err as Record<string, any>).status = res.status;
    (err as Record<string, any>).body = body;
    throw err;
  }

  if (canCache) {
    // Cache for a short period; do not cache auth-sensitive mutations.
    getCache.set(cacheKey, { value: body, expiresAt: now + 5_000 });
  }
  return body;
}

const getCache = new Map<string, { value: any; expiresAt: number }>();

// Auth
export async function apiLogin(email: string, password: string) {
  return request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}

export async function apiRegisterStudent(payload: Record<string, any>) {
  return request('/auth/register/student', { method: 'POST', body: JSON.stringify(payload) });
}

export async function apiRegisterAdmin(payload: Record<string, any>) {
  return request('/auth/register/admin', { method: 'POST', body: JSON.stringify(payload) });
}

export async function apiMe() {
  return request('/auth/me', { method: 'GET' });
}

export async function apiLogout() {
  return request('/auth/logout', { method: 'POST' });
}

export async function apiGetStudents(params: { semester?: string; dept?: string; section?: string; page?: number; limit?: number; } = {}) {
  const query = new URLSearchParams();
  if (params.semester) query.set('semester', params.semester);
  if (params.dept) query.set('dept', params.dept);
  if (params.section) query.set('section', params.section);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  return request(`/auth/students?${query.toString()}`, { method: 'GET' });
}

export async function apiGetStudent(studentId: string) {
  return request(`/auth/students/${studentId}`, { method: 'GET' });
}

// Tests
export async function apiGetTests() {
  return request('/tests', { method: 'GET' });
}

export async function apiGetTest(testId: string) {
  return request(`/tests/${testId}`, { method: 'GET' });
}

export async function apiCreateTest(payload: Record<string, any>) {
  return request('/tests', { method: 'POST', body: JSON.stringify(payload) });
}

export async function apiUploadQuestions(formData: FormData) {
  // upload uses multipart/form-data; do not set content-type header; add Authorization
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/tests/upload`, { method: 'POST', credentials: 'omit', headers, body: formData });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Upload failed');
  return json;
}

// Attempts
export async function apiStartAttempt(testId: string) {
  return request(`/tests/${testId}/start`, { method: 'POST' });
}

export async function apiSubmitAttempt(testId: string, body: {
  attemptId: string;
  answers: Answer[];
  suspiciousEvents?: Record<string, any>[];
  autoSubmitted?: boolean;
  malpracticeReason?: string;
}) {
  return request(`/tests/${testId}/submit`, { method: 'POST', body: JSON.stringify(body) });
}

export async function apiGetMyAttempts() {
  return request('/attempts/my', { method: 'GET' });
}

export async function apiGetAttemptsForTest(testId: string, params: Record<string, any> = {}) {
  const query = new URLSearchParams();
  // Add all params to query
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null) {
      query.set(key, String(params[key]));
    }
  });
  if (!query.has('page')) query.set('page', '1');
  if (!query.has('limit')) query.set('limit', '50');
  return request(`/tests/${testId}/attempts?${query.toString()}`, { method: 'GET' });
}

export async function apiGetNotAttendedForTest(testId: string, params: Record<string, any> = {}) {
  const query = new URLSearchParams();
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null) {
      query.set(key, String(params[key]));
    }
  });
  if (!query.has('page')) query.set('page', '1');
  if (!query.has('limit')) query.set('limit', '50');
  return request(`/tests/${testId}/not-attended?${query.toString()}`, { method: 'GET' });
}

// Admin: delete a test
export async function apiDeleteTest(testId: string) {
  return request(`/tests/${testId}`, { method: 'DELETE' });
}

export default {
  setToken,
  getToken,
  apiLogin,
  apiRegisterStudent,
  apiRegisterAdmin,
  apiMe,
  apiLogout,
  apiGetStudents,
  apiGetStudent,
  apiGetTests,
  apiGetTest,
  apiCreateTest,
  apiUploadQuestions,
  apiStartAttempt,
  apiSubmitAttempt,
  apiGetMyAttempts,
  apiGetAttemptsForTest,
  apiDeleteTest,
};