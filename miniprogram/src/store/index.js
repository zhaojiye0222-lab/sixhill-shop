import { reactive, ref, computed } from 'vue';
import { authRequest, jsonRequest } from '../utils/api';

// --- Shared State Variables ---
const userToken = ref(uni.getStorageSync('userToken') || '');
const currentUser = ref(uni.getStorageSync('userProfile') || null);

const allProducts = ref([]);
const categories = ref([]);
const activeCategory = ref(null);

const cart = ref(uni.getStorageSync('shopCart') || []);

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
  const saveCart = () => {
    uni.setStorageSync('shopCart', cart.value);
  };

  const addToCart = (product, quantity = 1, color = null, flavor = null, bundleFlavors = null) => {
    const existing = cart.value.find(item => 
      item.id === product.id && 
      item.selectedColor === color && 
      item.selectedFlavor === flavor &&
      JSON.stringify(item.bundleFlavors) === JSON.stringify(bundleFlavors)
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
  };

  const removeFromCart = (product, color, flavor = null, bundleFlavors = null) => {
    cart.value = cart.value.filter(item => 
      !(item.id === product.id && 
        item.selectedColor === color && 
        item.selectedFlavor === flavor &&
        JSON.stringify(item.bundleFlavors) === JSON.stringify(bundleFlavors))
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
    cartTotal,
    cartCount
  };
};
