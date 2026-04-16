"use strict";
const CONFIG = {
  API_BASE: "http://8.215.108.239/api",
  IMAGE_BASE: "http://8.215.108.239"
};
const getImageUrl = (url) => {
  if (!url)
    return "";
  if (url.startsWith("http") || url.startsWith("data:"))
    return url;
  if (url.startsWith("/api")) {
    return `${CONFIG.IMAGE_BASE}${url}`;
  }
  return `${CONFIG.IMAGE_BASE}/${url.replace(/^\//, "")}`;
};
exports.CONFIG = CONFIG;
exports.getImageUrl = getImageUrl;
