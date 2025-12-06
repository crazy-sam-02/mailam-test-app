import type { User, Test, Attempt, Answer } from '@/types';

const HOST = (typeof window !== 'undefined' && (window as any).location?.hostname) ? (window as any).location.hostname : 'localhost';
// Temporary: Force production URL to override incompatible local .env variables
let API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '/api';

// Ensure API_BASE ends with /api if it doesn't already
if (!API_BASE.endsWith('/api')) {
  // Remove trailing slash if present before appending /api
  API_BASE = API_BASE.replace(/\/$/, '') + '/api';
}

async function request(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, { ...opts, credentials: 'include', headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) } });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch (e) { body = text; }
  if (!res.ok) {
    const err = new Error(body?.error || res.statusText || 'Request failed');
    (err as Record<string, any>).status = res.status;
    (err as Record<string, any>).body = body;
    throw err;
  }
  return body;
}

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
  // upload uses multipart/form-data; do not set content-type header
  const res = await fetch(`${API_BASE}/tests/upload`, { method: 'POST', credentials: 'include', body: formData });
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

export async function apiGetAttemptsForTest(testId: string, page = 1, limit = 50) {
  return request(`/tests/${testId}/attempts?page=${page}&limit=${limit}`, { method: 'GET' });
}

// Admin: delete a test
export async function apiDeleteTest(testId: string) {
  return request(`/tests/${testId}`, { method: 'DELETE' });
}

export default {
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