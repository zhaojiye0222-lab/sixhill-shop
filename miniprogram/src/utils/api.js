// src/utils/api.js
import { CONFIG } from './config';

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
      url: url.startsWith('http') ? url : `${CONFIG.API_BASE}${url}`,
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
