// src/utils/api.js
const API_BASE = 'http://8.215.108.239/api'; // Use production IP for testing on real devices/emulator. Change to localhost for local backend if needed.

export const authRequest = (url, options = {}) => {
  return new Promise((resolve, reject) => {
    const token = uni.getStorageSync('userToken');
    const header = { ...options.header };
    
    if (token) {
      header['Authorization'] = `Bearer ${token}`;
    }

    if (options.method === 'POST' || options.method === 'PUT' || options.method === 'PATCH') {
      header['Content-Type'] = header['Content-Type'] || 'application/json';
    }

    uni.request({
      url: url.startsWith('http') ? url : `${API_BASE}${url}`,
      method: options.method || 'GET',
      data: options.data,
      header: header,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          reject(res.data || new Error('Request failed'));
        }
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
};

export const jsonRequest = (url, method, data) => {
  return authRequest(url, { method, data });
};
