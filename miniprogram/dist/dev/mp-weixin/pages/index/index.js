"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  __name: "index",
  setup(__props) {
    const featuredProducts = common_vendor.ref([]);
    const loading = common_vendor.ref(true);
    const API_BASE_URL = "http://127.0.0.1:3000/api";
    const fetchProducts = () => {
      loading.value = true;
      common_vendor.index.request({
        url: `${API_BASE_URL}/products`,
        method: "GET",
        success: (res) => {
          console.log("Products fetched:", res.data);
          const products = res.data || [];
          const devices = products.filter((p) => p.categoryId === "cat_devices");
          featuredProducts.value = devices.length > 0 ? devices.slice(0, 4) : products.slice(0, 4);
        },
        fail: (err) => {
          console.error("Failed to fetch products:", err);
          common_vendor.index.showToast({
            title: "Failed to load data",
            icon: "none"
          });
        },
        complete: () => {
          loading.value = false;
        }
      });
    };
    const formatPrice = (price) => {
      return Number(price).toLocaleString("id-ID");
    };
    common_vendor.onMounted(() => {
      fetchProducts();
    });
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: loading.value
      }, loading.value ? {} : {
        b: common_vendor.f(featuredProducts.value, (product, index, i0) => {
          return common_vendor.e({
            a: product.images && product.images.length > 0
          }, product.images && product.images.length > 0 ? {
            b: product.images[0]
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
