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
          let errMsg = 'Request failed';
          if (res.data) {
            if (typeof res.data === 'string') {
              errMsg = res.data;
            } else if (res.data.error) {
              errMsg = res.data.error;
            } else if (res.data.message) {
              errMsg = res.data.message;
            }
          }
          reject(new Error(errMsg));
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
