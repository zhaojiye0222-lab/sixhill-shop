/**
 * 购物车与变体选择逻辑
 */
function useCart(Vue, deps) {
  const { ref, computed, watch } = Vue;
  const { allProducts, userToken } = deps;
  const { API_BASE } = window.SixhillAPI;

  const cart = ref(JSON.parse(localStorage.getItem('cart') || '[]'));
  watch(cart, (newCart) => {
    localStorage.setItem('cart', JSON.stringify(newCart));
  }, { deep: true });

  const isCheckingOut = ref(false);
  const showCheckoutModal = ref(false);
  const paymentModalData = ref(null);
  const receiptPreview = ref(null);
  const receiptFile = ref(null);

  // 变体弹窗状态
  const showVariantModal = ref(false);
  const selectedProductForVariant = ref(null);
  const availableColors = ref([]);
  const selectedVariantColor = ref(null);
  const availableFlavors = ref([]);
  const selectedVariantFlavor = ref(null);
  const selectedVariantQuantity = ref(1);
  const isBundleVariant = ref(false);
  const bundleVariantFlavors = ref({});
  const bundleMaxFlavors = ref(0);

  const increaseBundleVariantFlavor = (id) => {
    if (bundleMaxFlavors.value > 0) {
      const totalQty = Object.values(bundleVariantFlavors.value).reduce((sum, q) => sum + q, 0);
      if (totalQty >= bundleMaxFlavors.value) {
        alert(`You can only select up to ${bundleMaxFlavors.value} flavors for this bundle.`);
        return;
      }
    }
    bundleVariantFlavors.value[id] = (bundleVariantFlavors.value[id] || 0) + 1;
  };

  const decreaseBundleVariantFlavor = (id) => {
    if (bundleVariantFlavors.value[id] && bundleVariantFlavors.value[id] > 0) {
      bundleVariantFlavors.value[id]--;
    }
  };

  const isConfirmDisabled = computed(() => {
    if (availableColors.value.length > 0 && !selectedVariantColor.value) return true;
    if (isBundleVariant.value) {
      const totalQty = Object.values(bundleVariantFlavors.value).reduce((sum, q) => sum + q, 0);
      if (bundleMaxFlavors.value > 0) return totalQty !== bundleMaxFlavors.value;
      return totalQty === 0;
    } else {
      return availableFlavors.value.length > 0 && !selectedVariantFlavor.value;
    }
  });

  const openVariantModal = (product) => {
    selectedProductForVariant.value = product;
    selectedVariantQuantity.value = 1;

    if (product.specs && product.specs.color) {
      const colors = product.specs.color.split(/[,，]/).map(c => c.trim()).filter(c => c);
      availableColors.value = colors.length > 0 ? colors : [];
      selectedVariantColor.value = colors.length > 0 ? colors[0] : null;
    } else {
      availableColors.value = [];
      selectedVariantColor.value = null;
    }

    if (product.categoryId === 'Bundle' || product.categoryId === 'cat_bundle') {
      isBundleVariant.value = true;
      bundleVariantFlavors.value = {};
      const nameMatch = product.name.match(/\d+\+(\d+)/);
      bundleMaxFlavors.value = nameMatch && nameMatch[1] ? parseInt(nameMatch[1]) : 0;
      availableFlavors.value = allProducts.value.filter(p => p.categoryId === 'cat_sticks');
      showVariantModal.value = true;
      return;
    }

    isBundleVariant.value = false;
    bundleMaxFlavors.value = 0;
    availableFlavors.value = [];
    selectedVariantFlavor.value = null;
    showVariantModal.value = true;
  };

  const openFlavorModal = (catGroup) => {
    if (!catGroup.products || catGroup.products.length === 0) return;
    selectedVariantQuantity.value = 1;
    if (catGroup.products.length > 1) {
      selectedProductForVariant.value = catGroup.products[0];
      availableColors.value = [];
      selectedVariantColor.value = null;
      availableFlavors.value = catGroup.products;
      selectedVariantFlavor.value = catGroup.products[0];
      showVariantModal.value = true;
    } else {
      selectedProductForVariant.value = catGroup.products[0];
      availableColors.value = [];
      selectedVariantColor.value = null;
      availableFlavors.value = [];
      selectedVariantFlavor.value = catGroup.products[0];
      showVariantModal.value = true;
    }
  };

  const closeVariantModal = () => {
    showVariantModal.value = false;
    selectedProductForVariant.value = null;
    availableColors.value = [];
    selectedVariantColor.value = null;
    availableFlavors.value = [];
    selectedVariantFlavor.value = null;
    selectedVariantQuantity.value = 1;
  };

  const addToCart = (product, color = null, quantity = 1, bundleFlavors = null) => {
    const existing = cart.value.find(item =>
      item.id === product.id &&
      item.selectedColor === color &&
      JSON.stringify(item.bundleFlavors) === JSON.stringify(bundleFlavors)
    );
    if (existing) {
      existing.qty += quantity;
    } else {
      cart.value.push({ ...product, qty: quantity, selectedColor: color, bundleFlavors });
    }
    alert(`Added ${quantity}x ${product.name}${color ? ' (' + color + ')' : ''} to cart!`);
  };

  const confirmAddToCart = () => {
    if (isBundleVariant.value) {
      const flavors = [];
      for (const [fid, qty] of Object.entries(bundleVariantFlavors.value)) {
        if (qty > 0) {
          const f = availableFlavors.value.find(x => x.id === fid);
          if (f) flavors.push({ id: f.id, name: f.name, sku: f.sku, qty });
        }
      }
      addToCart(selectedProductForVariant.value, selectedVariantColor.value, selectedVariantQuantity.value, flavors);
    } else if (availableFlavors.value.length > 0 && selectedVariantFlavor.value) {
      addToCart(selectedVariantFlavor.value, null, selectedVariantQuantity.value);
    } else if (selectedVariantFlavor.value) {
      addToCart(selectedVariantFlavor.value, null, selectedVariantQuantity.value);
    } else if (selectedProductForVariant.value) {
      addToCart(selectedProductForVariant.value, selectedVariantColor.value, selectedVariantQuantity.value);
    }
    closeVariantModal();
  };

  const updateCart = (index, delta) => {
    const item = cart.value[index];
    item.qty += delta;
    if (item.qty <= 0) cart.value.splice(index, 1);
  };

  const removeCartItem = (index) => cart.value.splice(index, 1);

  const clearCart = () => {
    if (confirm('Are you sure you want to clear your cart?')) cart.value = [];
  };

  const cartTotalItems = computed(() => cart.value.reduce((total, item) => total + item.qty, 0));
  const cartTotal = computed(() => cart.value.reduce((total, item) => total + (item.price * item.qty), 0).toFixed(2));

  return {
    cart, isCheckingOut, showCheckoutModal, paymentModalData, receiptPreview, receiptFile,
    showVariantModal, selectedProductForVariant, availableColors, selectedVariantColor,
    availableFlavors, selectedVariantFlavor, selectedVariantQuantity,
    isBundleVariant, bundleVariantFlavors, bundleMaxFlavors,
    increaseBundleVariantFlavor, decreaseBundleVariantFlavor, isConfirmDisabled,
    openVariantModal, openFlavorModal, closeVariantModal, confirmAddToCart, addToCart,
    updateCart, removeCartItem, clearCart, cartTotalItems, cartTotal
  };
}

window.useCart = useCart;
