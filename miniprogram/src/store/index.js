import { reactive, ref, computed } from 'vue';
import { authRequest, jsonRequest } from '../utils/api';

// --- Shared State Variables ---
const userToken = ref(uni.getStorageSync('userToken') || '');
const currentUser = ref(uni.getStorageSync('userProfile') || null);

const allProducts = ref([]);
const categories = ref([]);
const activeCategory = ref(null);

const cartData = uni.getStorageSync('shopCart');
const cart = ref(Array.isArray(cartData) ? cartData : []);

// --- Auth State ---
export const useAuthStore = () => {
  const login = async (username, password) => {
    try {
      const res = await jsonRequest('/login', 'POST', { username, password });
      userToken.value = res.token;
      currentUser.value = res.user;
      uni.setStorageSync('userToken', res.token);
      uni.setStorageSync('userProfile', res.user);
      return res;
    } catch (err) {
      throw err;
    }
  };

  const register = async (userData) => {
    try {
      const res = await jsonRequest('/register', 'POST', userData);
      userToken.value = res.token;
      currentUser.value = res.user;
      uni.setStorageSync('userToken', res.token);
      uni.setStorageSync('userProfile', res.user);
      return res;
    } catch (err) {
      throw err;
    }
  };

  const logout = () => {
    userToken.value = '';
    currentUser.value = null;
    uni.removeStorageSync('userToken');
    uni.removeStorageSync('userProfile');
  };

  return {
    userToken,
    currentUser,
    login,
    register,
    logout,
  };
};

// --- Product State ---
export const useProductStore = () => {
  const fetchProductsAndCategories = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        authRequest('/products'),
        authRequest('/categories')
      ]);
      allProducts.value = prodRes;
      categories.value = catRes;
    } catch (err) {
      console.error('Failed to fetch data', err);
    }
  };

  return {
    allProducts,
    categories,
    activeCategory,
    fetchProductsAndCategories
  };
};

// --- Cart State ---
export const useCartStore = () => {
  const updateBadge = () => {
    const count = cart.value.reduce((sum, item) => sum + item.qty, 0);
    if (count > 0) {
      uni.setTabBarBadge({ index: 2, text: String(count) }).catch(() => {});
    } else {
      uni.removeTabBarBadge({ index: 2 }).catch(() => {});
    }
  };

  const saveCart = () => {
    try {
      uni.setStorageSync('shopCart', cart.value);
      updateBadge();
    } catch (e) {
      console.error('Failed to save cart', e);
    }
  };

  const addToCart = (product, quantity = 1, color = null, flavor = null, bundleFlavors = null) => {
    try {
      const existing = cart.value.find(item => 
        item.id === product.id && 
        item.selectedColor === color && 
        (item.selectedFlavor ? item.selectedFlavor.id : null) === (flavor ? flavor.id : null) &&
        JSON.stringify(item.bundleFlavors || null) === JSON.stringify(bundleFlavors || null)
      );
      
      if (existing) {
        existing.qty += quantity;
      } else {
        cart.value.push({
          ...product,
          qty: quantity,
          selectedColor: color,
          selectedFlavor: flavor,
          bundleFlavors: bundleFlavors
        });
      }
      saveCart();
    } catch (err) {
      console.error('Error in addToCart:', err);
      uni.showToast({ title: 'Failed to add to cart', icon: 'none' });
    }
  };

  const removeFromCart = (product, color, flavor = null, bundleFlavors = null) => {
    cart.value = cart.value.filter(item => 
      !(item.id === product.id && 
        item.selectedColor === color && 
        (item.selectedFlavor ? item.selectedFlavor.id : null) === (flavor ? flavor.id : null) &&
        JSON.stringify(item.bundleFlavors || null) === JSON.stringify(bundleFlavors || null))
    );
    saveCart();
  };

  const clearCart = () => {
    cart.value = [];
    saveCart();
  };

  const cartTotal = computed(() => {
    return cart.value.reduce((sum, item) => sum + (item.price * item.qty), 0);
  });

  const cartCount = computed(() => {
    return cart.value.reduce((sum, item) => sum + item.qty, 0);
  });

  return {
    cart,
    addToCart,
    removeFromCart,
    clearCart,
    saveCart,
    updateBadge,
    cartTotal,
    cartCount
  };
};
