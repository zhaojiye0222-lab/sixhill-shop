/**
 * API 基础配置与请求工具
 */
const API_BASE = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168.')
  ? `http://${window.location.hostname}:3000/api`
  : '/api';

/**
 * 带认证头的 fetch 封装
 */
async function authFetch(url, options = {}) {
  const token = localStorage.getItem('userToken');
  const headers = { ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(url, { ...options, headers });
}

/**
 * JSON POST/PATCH/PUT 请求封装
 */
async function jsonRequest(url, method, body) {
  return authFetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

// 挂载到全局
window.SixhillAPI = { API_BASE, authFetch, jsonRequest };
