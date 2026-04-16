"use strict";
const common_vendor = require("../common/vendor.js");
const utils_api = require("../utils/api.js");
const userToken = common_vendor.ref(common_vendor.index.getStorageSync("userToken") || "");
const currentUser = common_vendor.ref(common_vendor.index.getStorageSync("userProfile") || null);
const allProducts = common_vendor.ref([]);
const categories = common_vendor.ref([]);
const activeCategory = common_vendor.ref(null);
const getInitialCart = () => {
  const data = common_vendor.index.getStorageSync("shopCart");
  if (!data)
    return [];
  if (Array.isArray(data))
    return data;
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  return [];
};
const cart = common_vendor.ref(getInitialCart());
const globalCartTotal = common_vendor.computed(() => {
  return cart.value.reduce((sum, item) => sum + item.price * item.qty, 0);
});
const globalCartCount = common_vendor.computed(() => {
  return cart.value.reduce((sum, item) => sum + item.qty, 0);
});
const useAuthStore = () => {
  const login = async (username, password) => {
    try {
      const res = await utils_api.jsonRequest("/login", "POST", { username, password });
      userToken.value = res.token;
      currentUser.value = res.user;
      common_vendor.index.setStorageSync("userToken", res.token);
      common_vendor.index.setStorageSync("userProfile", res.user);
      return res;
    } catch (err) {
      throw err;
    }
  };
  const register = async (userData) => {
    try {
      const res = await utils_api.jsonRequest("/register", "POST", userData);
      userToken.value = res.token;
      currentUser.value = res.user;
      common_vendor.index.setStorageSync("userToken", res.token);
      common_vendor.index.setStorageSync("userProfile", res.user);
      return res;
    } catch (err) {
      throw err;
    }
  };
  const logout = () => {
    userToken.value = "";
    currentUser.value = null;
    common_vendor.index.removeStorageSync("userToken");
    common_vendor.index.removeStorageSync("userProfile");
  };
  return {
    userToken,
    currentUser,
    login,
    register,
    logout
  };
};
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
  const updateBadge = () => {
    const count = globalCartCount.value;
    setTimeout(() => {
      if (count > 0) {
        common_vendor.index.setTabBarBadge({ index: 2, text: String(count) }).catch(() => {
        });
      } else {
        common_vendor.index.removeTabBarBadge({ index: 2 }).catch(() => {
        });
      }
    }, 100);
  };
  const saveCart = () => {
    try {
      common_vendor.index.setStorageSync("shopCart", cart.value);
      updateBadge();
    } catch (e) {
      console.error("Failed to save cart", e);
    }
  };
  const addToCart = (product, quantity = 1, color = null, flavor = null, bundleFlavors = null) => {
    try {
      const existing = cart.value.find(
        (item) => item.id === product.id && item.selectedColor === color && (item.selectedFlavor ? item.selectedFlavor.id : null) === (flavor ? flavor.id : null) && JSON.stringify(item.bundleFlavors || null) === JSON.stringify(bundleFlavors || null)
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
    } catch (err) {
      console.error("Error in addToCart:", err);
      common_vendor.index.showToast({ title: "Failed to add to cart", icon: "none" });
    }
  };
  const removeFromCart = (product, color, flavor = null, bundleFlavors = null) => {
    cart.value = cart.value.filter(
      (item) => !(item.id === product.id && item.selectedColor === color && (item.selectedFlavor ? item.selectedFlavor.id : null) === (flavor ? flavor.id : null) && JSON.stringify(item.bundleFlavors || null) === JSON.stringify(bundleFlavors || null))
    );
    saveCart();
  };
  const clearCart = () => {
    cart.value = [];
    saveCart();
  };
  return {
    cart,
    addToCart,
    removeFromCart,
    clearCart,
    saveCart,
    updateBadge,
    cartTotal: globalCartTotal,
    cartCount: globalCartCount
  };
};
exports.useAuthStore = useAuthStore;
exports.useCartStore = useCartStore;
exports.useProductStore = useProductStore;
