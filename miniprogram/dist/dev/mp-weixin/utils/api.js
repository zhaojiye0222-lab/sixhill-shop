"use strict";
const common_vendor = require("../common/vendor.js");
const API_BASE = "http://8.215.108.239/api";
const authRequest = (url, options = {}) => {
  return new Promise((resolve, reject) => {
    const token = common_vendor.index.getStorageSync("userToken");
    const header = { ...options.header };
    if (token) {
      header["Authorization"] = `Bearer ${token}`;
    }
    if (options.method === "POST" || options.method === "PUT" || options.method === "PATCH") {
      header["Content-Type"] = header["Content-Type"] || "application/json";
    }
    common_vendor.index.request({
      url: url.startsWith("http") ? url : `${API_BASE}${url}`,
      method: options.method || "GET",
      data: options.data,
      header,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          reject(res.data || new Error("Request failed"));
        }
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
};
exports.authRequest = authRequest;
