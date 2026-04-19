export const CONFIG = {
  API_BASE: 'http://8.215.108.239/api',
  IMAGE_BASE: 'http://8.215.108.239'
};

export const getImageUrl = (url) => {
  if (!url) return '';

  // 1. 修复数据库中硬编码的本地 IP (如 192.168.x.x 或 localhost)
  if (typeof url === 'string' && (url.includes('192.168.') || url.includes('localhost') || url.includes('127.0.0.1'))) {
    const match = url.match(/(\/uploads\/.*)$/);
    if (match) {
      return `${CONFIG.IMAGE_BASE}/api${match[1]}`;
    }
  }

  // 2. 正常的完整 http 链接或 base64 直接返回
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  
  // 3. 已经是 /api 开头的路径
  if (url.startsWith('/api')) {
    return `${CONFIG.IMAGE_BASE}${url}`;
  }
  
  // 4. 只有 uploads/... 的路径自动补齐 /api/
  const cleanUrl = url.replace(/^\//, '');
  if (cleanUrl.startsWith('uploads/')) {
    return `${CONFIG.IMAGE_BASE}/api/${cleanUrl}`;
  }
  
  return `${CONFIG.IMAGE_BASE}/${cleanUrl}`;
};
