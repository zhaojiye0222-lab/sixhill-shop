/**
 * Sixhill Shop - 主 Vue 应用入口
 * 从各个 composable 模块组装完整应用
 */
const { createApp, ref, computed, watch, onMounted } = Vue;

createApp({
  setup() {
    // 全局 UI 状态
    const activeTab = ref('home');
    const showSearchModal = ref(false);
    const showNotificationModal = ref(false);
    const showOrderHistory = ref(false);
    const orderStatusFilter = ref('all');

    // URL 参数处理
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam) activeTab.value = tabParam;

    // 初始化各模块
    const auth = window.useAuth(Vue);
    const products = window.useProducts(Vue);
    const address = window.useAddress(Vue);

    const cart = window.useCart(Vue, {
      allProducts: products.allProducts,
      userToken: auth.userToken
    });

    const orders = window.useOrders(Vue, {
      userToken: auth.userToken,
      currentUser: auth.currentUser,
      cart: cart.cart,
      isCheckingOut: cart.isCheckingOut,
      showCheckoutModal: cart.showCheckoutModal,
      paymentModalData: cart.paymentModalData,
      receiptPreview: cart.receiptPreview,
      receiptFile: cart.receiptFile,
      checkoutAddress: address.checkoutAddress,
      isEditingCheckoutAddress: address.isEditingCheckoutAddress,
      showOrderHistory,
      orderStatusFilter
    });

    // 导航函数
    const viewProduct = (product) => {
      if (!product) return;
      const identifier = product.id || product.sku;
      if (!identifier) return;
      window.location.href = `/frontend/product.html?id=${identifier}`;
    };

    const viewProductAndCloseSearch = (product) => {
      showSearchModal.value = false;
      viewProduct(product);
    };

    const goToCategory = (catId) => {
      if (catId === 'new') catId = 'cat_devices';
      const categoryExists = products.categories.value.find(c => c.id === catId);
      if (categoryExists) {
        products.currentCategory.value = catId;
      } else if (products.categories.value.length > 0) {
        products.currentCategory.value = products.categories.value[0].id;
      }
      products.currentSubCategory.value = null;
      activeTab.value = 'category';
    };

    const formatPrice = (price) => Number(price).toLocaleString('id-ID');

    // 图片加载失败处理
    const handleImageError = (event, productName) => {
      const img = event.target;
      img.classList.add('fallback-active');
      if (!img.nextElementSibling || !img.nextElementSibling.classList.contains('img-fallback-bg')) {
        const fallbackDiv = document.createElement('div');
        fallbackDiv.className = 'img-fallback-bg flex flex-col items-center justify-center w-full h-full bg-gray-100 text-gray-400 absolute inset-0';
        const icon = document.createElement('i');
        icon.className = 'ph ph-image-broken text-3xl mb-1';
        const text = document.createElement('span');
        text.className = 'text-[10px] text-center px-1 truncate w-full';
        let safeName = 'No Image';
        if (productName) {
          if (typeof productName === 'string') safeName = productName;
          else if (typeof productName === 'object' && productName.name) safeName = productName.name;
        }
        text.innerText = safeName;
        fallbackDiv.appendChild(icon);
        fallbackDiv.appendChild(text);
        if (getComputedStyle(img.parentNode).position === 'static') {
          img.parentNode.style.position = 'relative';
        }
        img.style.opacity = '0';
        img.parentNode.appendChild(fallbackDiv);
      }
    };

    // checkout 中的 tab 切换逻辑
    const wrappedCheckoutCart = () => {
      const result = orders.checkoutCart();
      if (result === 'need_login') activeTab.value = 'profile';
    };

    const wrappedPayLater = async () => {
      const result = await orders.payLater();
      if (result === 'go_profile') activeTab.value = 'profile';
    };

    const wrappedConfirmCheckout = async () => {
      const result = await orders.confirmCheckout();
      if (result === 'go_profile') activeTab.value = 'profile';
    };

    // 监听 tab 切换
    watch(activeTab, (newTab) => {
      if (newTab === 'profile' && auth.userToken.value) {
        orders.fetchMyOrders();
      }
    });

    // 生命周期
    onMounted(() => {
      products.fetchProductsAndCategories();
      if (auth.userToken.value) orders.fetchMyOrders();

      if (urlParams.get('openCart') === 'true') {
        activeTab.value = 'cart';
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    });

    // 返回所有模板需要的变量
    return {
      // UI
      activeTab, showSearchModal, showNotificationModal, showOrderHistory, orderStatusFilter,
      // Auth
      ...auth,
      handleLogin: () => auth.handleLogin(orders.fetchMyOrders),
      // Products
      ...products,
      viewProduct, viewProductAndCloseSearch, goToCategory,
      // Cart
      ...cart,
      // Orders
      ...orders,
      checkoutCart: wrappedCheckoutCart,
      payLater: wrappedPayLater,
      confirmCheckout: wrappedConfirmCheckout,
      // Address
      ...address,
      // Helpers
      formatPrice, handleImageError
    };
  }
}).mount('#app');
