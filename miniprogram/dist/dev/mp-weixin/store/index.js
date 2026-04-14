"use strict";
const common_vendor = require("../common/vendor.js");
const utils_api = require("../utils/api.js");
common_vendor.ref(common_vendor.index.getStorageSync("userToken") || "");
common_vendor.ref(common_vendor.index.getStorageSync("userProfile") || null);
const allProducts = common_vendor.ref([]);
const categories = common_vendor.ref([]);
const activeCategory = common_vendor.ref(null);
const cart = common_vendor.ref(common_vendor.index.getStorageSync("shopCart") || []);
const useProductStore = () => {
  const fetchProductsAndCategories = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        utils_api.authRequest("/products"),
        utils_api.authRequest("/categories")
      ]);
      allProducts.value = prodRes;
      categories.value = catRes;
    } catch (err) {
      console.error("Failed to fetch data", err);
    }
  };
  return {
    allProducts,
    categories,
    activeCategory,
    fetchProductsAndCategories
  };
};
const useCartStore = () => {
  const saveCart = () => {
    common_vendor.index.setStorageSync("shopCart", cart.value);
  };
  const addToCart = (product, quantity = 1, color = null, flavor = null, bundleFlavors = null) => {
    const existing = cart.value.find(
      (item) => item.id === product.id && item.selectedColor === color && item.selectedFlavor === flavor && JSON.stringify(item.bundleFlavors) === JSON.stringify(bundleFlavors)
    );
    if (existing) {
      existing.qty += quantity;
    } else {
      cart.value.push({
        ...product,
        qty: quantity,
        selectedColor: color,
        selectedFlavor: flavor,
        bundleFlavors
      });
    }
    saveCart();
  };
  const removeFromCart = (product, color, flavor = null, bundleFlavors = null) => {
    cart.value = cart.value.filter(
      (item) => !(item.id === product.id && item.selectedColor === color && item.selectedFlavor === flavor && JSON.stringify(item.bundleFlavors) === JSON.stringify(bundleFlavors))
    );
    saveCart();
  };
  const clearCart = () => {
    cart.value = [];
    saveCart();
  };
  const cartTotal = common_vendor.computed(() => {
    return cart.value.reduce((sum, item) => sum + item.price * item.qty, 0);
  });
  const cartCount = common_vendor.computed(() => {
    return cart.value.reduce((sum, item) => sum + item.qty, 0);
  });
  return {
    cart,
    addToCart,
    removeFromCart,
    clearCart,
    cartTotal,
    cartCount
  };
};
exports.useCartStore = useCartStore;
exports.useProductStore = useProductStore;
