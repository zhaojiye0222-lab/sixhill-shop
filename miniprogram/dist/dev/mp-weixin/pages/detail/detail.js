"use strict";
const common_vendor = require("../../common/vendor.js");
const store_index = require("../../store/index.js");
const utils_config = require("../../utils/config.js");
require("../../utils/api.js");
const _sfc_main = {
  __name: "detail",
  setup(__props) {
    const productStore = store_index.useProductStore();
    const cartStore = store_index.useCartStore();
    const productId = common_vendor.ref(null);
    const product = common_vendor.ref(null);
    const loading = common_vendor.ref(true);
    const showSkuModal = common_vendor.ref(false);
    const skuAction = common_vendor.ref("cart");
    const quantity = common_vendor.ref(1);
    const selectedColor = common_vendor.ref("");
    const selectedFlavor = common_vendor.ref(null);
    const allFlavors = common_vendor.ref([]);
    common_vendor.onLoad(async (options) => {
      if (options.id) {
        productId.value = options.id;
        await loadProduct();
      }
    });
    const loadProduct = async () => {
      loading.value = true;
      if (productStore.allProducts.value.length === 0) {
        await productStore.fetchProductsAndCategories();
      }
      const found = productStore.allProducts.value.find((p) => String(p.id) === String(productId.value));
      if (found) {
        product.value = found;
        if (availableColors.value.length > 0) {
          selectedColor.value = availableColors.value[0];
        }
        if (product.value.categoryId === "cat_devices" || product.value.categoryId === "cat_sticks") {
          const siblings = productStore.allProducts.value.filter(
            (p) => p.categoryId === product.value.categoryId && p.subCategoryId === product.value.subCategoryId && p.id !== product.value.id
          );
          if (siblings.length > 0) {
            allFlavors.value = [product.value, ...siblings];
            selectedFlavor.value = null;
          }
        }
      }
      loading.value = false;
    };
    common_vendor.onPullDownRefresh(async () => {
      await productStore.fetchProductsAndCategories();
      await loadProduct();
      common_vendor.index.stopPullDownRefresh();
    });
    const formatPrice = (price) => {
      return Number(price).toLocaleString("id-ID");
    };
    const availableColors = common_vendor.computed(() => {
      if (!product.value)
        return [];
      if (product.value.colors)
        return product.value.colors.split(",").map((c) => c.trim());
      if (product.value.specs && product.value.specs.color)
        return product.value.specs.color.split(",").map((c) => c.trim());
      return [];
    });
    const cartCount = cartStore.cartCount;
    const goHome = () => {
      common_vendor.index.switchTab({ url: "/pages/index/index" });
    };
    const goToCart = () => {
      common_vendor.index.switchTab({ url: "/pages/cart/cart" });
    };
    const openSkuModal = (action = "cart") => {
      skuAction.value = action;
      showSkuModal.value = true;
    };
    const closeSkuModal = () => {
      showSkuModal.value = false;
    };
    const confirmSku = () => {
      try {
        if (!selectedColor.value && availableColors.value.length > 0) {
          common_vendor.index.showToast({ title: "Please select a color", icon: "none" });
          return;
        }
        const productToAdd = selectedFlavor.value ? selectedFlavor.value : product.value;
        const finalColor = selectedColor.value || "Default";
        const flavorToSave = selectedFlavor.value && selectedFlavor.value.id !== product.value.id ? selectedFlavor.value : null;
        if (skuAction.value === "cart") {
          cartStore.addToCart(productToAdd, quantity.value, finalColor, flavorToSave);
          common_vendor.index.showToast({ title: "Added to cart", icon: "success" });
          closeSkuModal();
        } else {
          cartStore.addToCart(productToAdd, quantity.value, finalColor, flavorToSave);
          closeSkuModal();
          common_vendor.index.switchTab({ url: "/pages/cart/cart" });
        }
      } catch (e) {
        console.error("confirmSku error:", e);
        common_vendor.index.showToast({ title: "Failed: " + String(e.message || e), icon: "none" });
      }
    };
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: loading.value
      }, loading.value ? {} : product.value ? common_vendor.e({
        c: !product.value.images || product.value.images.length === 0
      }, !product.value.images || product.value.images.length === 0 ? {
        d: common_vendor.unref(utils_config.getImageUrl)(product.value.image_url)
      } : {
        e: common_vendor.f(product.value.images, (img, index, i0) => {
          return {
            a: common_vendor.unref(utils_config.getImageUrl)(img),
            b: index
          };
        })
      }, {
        f: common_vendor.t(formatPrice(product.value.price)),
        g: product.value.isNew
      }, product.value.isNew ? {} : {}, {
        h: common_vendor.t(product.value.name),
        i: common_vendor.t(product.value.brand || "Sixhill"),
        j: common_vendor.t(selectedColor.value ? selectedColor.value : "Color"),
        k: common_vendor.t(selectedFlavor.value ? ", " + selectedFlavor.value.name : ""),
        l: common_vendor.o(openSkuModal),
        m: !product.value.description
      }, !product.value.description ? {} : {
        n: common_vendor.t(product.value.description)
      }, {
        o: product.value.specs
      }, product.value.specs ? common_vendor.e({
        p: product.value.specs.battery
      }, product.value.specs.battery ? {
        q: common_vendor.t(product.value.specs.battery)
      } : {}, {
        r: product.value.specs.heatingTime
      }, product.value.specs.heatingTime ? {
        s: common_vendor.t(product.value.specs.heatingTime)
      } : {}) : {}) : {}, {
        b: product.value,
        t: common_vendor.o(goHome),
        v: common_vendor.unref(cartCount) > 0
      }, common_vendor.unref(cartCount) > 0 ? {
        w: common_vendor.t(common_vendor.unref(cartCount))
      } : {}, {
        x: common_vendor.o(goToCart),
        y: common_vendor.o(($event) => openSkuModal("cart")),
        z: common_vendor.o(($event) => openSkuModal("buy")),
        A: showSkuModal.value
      }, showSkuModal.value ? common_vendor.e({
        B: common_vendor.o(closeSkuModal),
        C: common_vendor.o(closeSkuModal),
        D: product.value.images && product.value.images.length > 0
      }, product.value.images && product.value.images.length > 0 ? {
        E: common_vendor.unref(utils_config.getImageUrl)(product.value.images[0])
      } : {
        F: common_vendor.unref(utils_config.getImageUrl)(product.value.image_url)
      }, {
        G: common_vendor.t(formatPrice(product.value.price)),
        H: common_vendor.t(product.value.stock > 0 ? product.value.stock : "Out of stock"),
        I: common_vendor.t(selectedColor.value || "Color"),
        J: common_vendor.unref(availableColors).length > 0
      }, common_vendor.unref(availableColors).length > 0 ? {
        K: common_vendor.f(common_vendor.unref(availableColors), (color, k0, i0) => {
          return {
            a: common_vendor.t(color),
            b: color,
            c: common_vendor.o(($event) => selectedColor.value = color, color),
            d: common_vendor.n(selectedColor.value === color ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-medium" : "border-gray-200 text-gray-600 bg-white")
          };
        })
      } : {}, {
        L: allFlavors.value && allFlavors.value.length > 0
      }, allFlavors.value && allFlavors.value.length > 0 ? {
        M: common_vendor.f(allFlavors.value, (flavor, k0, i0) => {
          return common_vendor.e({
            a: flavor.images && flavor.images.length > 0
          }, flavor.images && flavor.images.length > 0 ? {
            b: common_vendor.unref(utils_config.getImageUrl)(flavor.images[0])
          } : {}, {
            c: common_vendor.t(flavor.name),
            d: (selectedFlavor.value ? selectedFlavor.value.id : product.value.id) === flavor.id
          }, (selectedFlavor.value ? selectedFlavor.value.id : product.value.id) === flavor.id ? {} : {}, {
            e: common_vendor.n((selectedFlavor.value ? selectedFlavor.value.id : product.value.id) === flavor.id ? "border-indigo-600 bg-indigo-600" : "border-gray-300"),
            f: flavor.id,
            g: common_vendor.o(($event) => selectedFlavor.value = flavor, flavor.id),
            h: common_vendor.n((selectedFlavor.value ? selectedFlavor.value.id : product.value.id) === flavor.id ? "border-indigo-600 bg-indigo-50" : "border-gray-200 bg-white")
          });
        })
      } : {}, {
        N: common_vendor.o(($event) => quantity.value > 1 && quantity.value--),
        O: common_vendor.t(quantity.value),
        P: common_vendor.o(($event) => quantity.value < product.value.stock && quantity.value++),
        Q: common_vendor.t(product.value.stock && Number(product.value.stock) > 0 ? "Confirm" : "Out of Stock"),
        R: !product.value.stock || Number(product.value.stock) <= 0 ? 1 : "",
        S: !product.value.stock || Number(product.value.stock) <= 0,
        T: common_vendor.o(confirmSku)
      }) : {});
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-9cb6f745"], ["__file", "C:/Users/admin/Documents/trae_projects/Jake/miniprogram/src/pages/detail/detail.vue"]]);
wx.createPage(MiniProgramPage);
