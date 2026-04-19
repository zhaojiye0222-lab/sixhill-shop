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

/**
 * 修复图片 URL
 */
function getImageUrl(url) {
  if (!url) return '';
  if (typeof url === 'string' && (url.includes('192.168.') || url.includes('localhost') || url.includes('127.0.0.1'))) {
    const match = url.match(/(\/uploads\/.*)$/);
    if (match) {
      return API_BASE.replace('/api', '') + '/api' + match[1];
    }
  }
  if (typeof url === 'string' && (url.startsWith('http') || url.startsWith('data:'))) return url;
  
  let cleanUrl = url;
  if (typeof url === 'string') {
    cleanUrl = url.replace(/^\//, '');
    if (cleanUrl.startsWith('api/')) {
      return API_BASE.replace('/api', '') + '/' + cleanUrl;
    }
    if (cleanUrl.startsWith('uploads/')) {
      return API_BASE + '/' + cleanUrl;
    }
  }
  return API_BASE.replace('/api', '') + '/' + cleanUrl;
}

// 挂载到全局
window.SixhillAPI = { API_BASE, authFetch, jsonRequest, getImageUrl };
