"use strict";
const common_vendor = require("../../common/vendor.js");
const store_index = require("../../store/index.js");
require("../../utils/api.js");
const _sfc_main = {
  __name: "index",
  setup(__props) {
    const productStore = store_index.useProductStore();
    const featuredProducts = common_vendor.ref([]);
    const loading = common_vendor.ref(true);
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
    const getImageUrl = (url) => {
      if (!url)
        return "";
      if (url.startsWith("http") || url.startsWith("data:"))
        return url;
      return url.startsWith("/") ? `http://8.215.108.239${url}` : `http://8.215.108.239/${url}`;
    };
    const goToCategory = (catId) => {
      productStore.activeCategory.value = catId;
      common_vendor.index.switchTab({
        url: "/pages/category/category"
      });
    };
    common_vendor.onMounted(() => {
      fetchProducts();
    });
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: common_vendor.o(($event) => goToCategory("cat_devices")),
        b: common_vendor.o(($event) => goToCategory("cat_sticks")),
        c: common_vendor.o(($event) => goToCategory("cat_accessories")),
        d: common_vendor.o(($event) => goToCategory("new")),
        e: loading.value
      }, loading.value ? {} : {
        f: common_vendor.f(featuredProducts.value, (product, index, i0) => {
          return common_vendor.e({
            a: product.images && product.images.length > 0
          }, product.images && product.images.length > 0 ? {
            b: getImageUrl(product.images[0])
          } : {}, {
            c: common_vendor.t(product.name),
            d: common_vendor.t(product.description),
            e: common_vendor.t(formatPrice(product.price)),
            f: index
          });
        })
      });
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__file", "C:/Users/admin/Documents/trae_projects/Jake/miniprogram/src/pages/index/index.vue"]]);
wx.createPage(MiniProgramPage);
