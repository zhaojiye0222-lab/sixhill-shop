"use strict";
const common_vendor = require("../common/vendor.js");
const utils_config = require("./config.js");
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
      url: url.startsWith("http") ? url : `${utils_config.CONFIG.API_BASE}${url}`,
      method: options.method || "GET",
      data: options.data,
      header,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          let errMsg = "Request failed";
          if (res.data) {
            if (typeof res.data === "string") {
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
const jsonRequest = (url, method, data) => {
  return authRequest(url, { method, data });
};
exports.authRequest = authRequest;
exports.jsonRequest = jsonRequest;
