"use strict";
const common_vendor = require("../../common/vendor.js");
const store_index = require("../../store/index.js");
const utils_config = require("../../utils/config.js");
require("../../utils/api.js");
const _sfc_main = {
  __name: "index",
  setup(__props) {
    const productStore = store_index.useProductStore();
    const cartStore = store_index.useCartStore();
    const featuredProducts = common_vendor.ref([]);
    const loading = common_vendor.ref(true);
    common_vendor.onShow(() => {
      cartStore.updateBadge();
    });
    const fetchProducts = async () => {
      loading.value = true;
      try {
        await productStore.fetchProductsAndCategories();
        const products = productStore.allProducts.value || [];
        const devices = products.filter((p) => p.categoryId === "cat_devices");
        featuredProducts.value = devices.length > 0 ? devices.slice(0, 4) : products.slice(0, 4);
      } catch (err) {
        console.error("Failed to fetch products:", err);
        common_vendor.index.showToast({
          title: "Failed to load data",
          icon: "none"
        });
      } finally {
        loading.value = false;
      }
    };
    const formatPrice = (price) => {
      return Number(price).toLocaleString("id-ID");
    };
    const goToCategory = (categoryId) => {
      productStore.activeCategory.value = categoryId;
      common_vendor.index.switchTab({
        url: "/pages/category/category"
      });
    };
    const goToDetail = (product) => {
      common_vendor.index.navigateTo({
        url: `/pages/detail/detail?id=${product.id}`
      });
    };
    const addToCart = (product) => {
      try {
        const color = product.colors ? product.colors.split(",")[0] : "Default";
        cartStore.addToCart(product, 1, color);
        common_vendor.index.showToast({
          title: "Added to cart",
          icon: "success"
        });
      } catch (e) {
        console.error("addToCart error:", e);
      }
    };
    common_vendor.onMounted(() => {
      fetchProducts();
    });
    common_vendor.onPullDownRefresh(async () => {
      await fetchProducts();
      common_vendor.index.stopPullDownRefresh();
    });
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: common_vendor.o(($event) => goToCategory("cat_devices")),
        b: common_vendor.o(($event) => goToCategory("cat_devices")),
        c: common_vendor.o(($event) => goToCategory("cat_sticks")),
        d: common_vendor.o(($event) => goToCategory("cat_accessories")),
        e: common_vendor.o(($event) => goToCategory("new")),
        f: common_vendor.o(($event) => goToCategory("cat_devices")),
        g: loading.value
      }, loading.value ? {} : {
        h: common_vendor.f(featuredProducts.value, (product, index, i0) => {
          return common_vendor.e({
            a: product.images && product.images.length > 0
          }, product.images && product.images.length > 0 ? {
            b: common_vendor.unref(utils_config.getImageUrl)(product.images[0])
          } : product.image_url ? {
            d: common_vendor.unref(utils_config.getImageUrl)(product.image_url)
          } : {}, {
            c: product.image_url,
            e: common_vendor.t(product.name),
            f: common_vendor.t(product.description),
            g: common_vendor.t(formatPrice(product.price)),
            h: common_vendor.o(($event) => addToCart(product), index),
            i: index,
            j: common_vendor.o(($event) => goToDetail(product), index)
          });
        })
      });
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__file", "C:/Users/admin/Documents/trae_projects/Jake/miniprogram/src/pages/index/index.vue"]]);
wx.createPage(MiniProgramPage);
