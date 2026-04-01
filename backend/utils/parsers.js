/**
 * 安全解析 images 字段（兼容 JSON 数组字符串、单字符串、已解析数组）
 */
function parseImages(raw) {
  try {
    if (typeof raw === 'string') {
      if (raw.trim().startsWith('[')) return JSON.parse(raw);
      return raw.trim() ? [raw] : [];
    }
    if (Array.isArray(raw)) return raw;
  } catch (e) {
    if (typeof raw === 'string' && raw.trim()) return [raw];
  }
  return [];
}

/**
 * 安全解析 specs 字段（兼容 JSON 对象字符串、已解析对象）
 */
function parseSpecs(raw) {
  try {
    if (typeof raw === 'string' && raw.trim().startsWith('{')) return JSON.parse(raw);
    if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) return raw;
  } catch (e) {}
  return {};
}

/**
 * 将数据库行转为前端友好的产品对象
 */
function formatProduct(row) {
  return {
    ...row,
    images: parseImages(row.images),
    specs: parseSpecs(row.specs),
    categoryId: row.category_id,
    subCategoryId: row.sub_category_id
  };
}

module.exports = { parseImages, parseSpecs, formatProduct };
