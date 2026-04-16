"use strict";
const common_vendor = require("../../common/vendor.js");
const store_index = require("../../store/index.js");
const utils_config = require("../../utils/config.js");
require("../../utils/api.js");
const _sfc_main = {
  __name: "category",
  setup(__props) {
    const productStore = store_index.useProductStore();
    const cartStore = store_index.useCartStore();
    const currentCategory = common_vendor.ref("cat_devices");
    const currentSubCategory = common_vendor.ref(null);
    common_vendor.onShow(() => {
      cartStore.updateBadge();
      if (productStore.activeCategory.value) {
        currentCategory.value = productStore.activeCategory.value;
        currentSubCategory.value = null;
        productStore.activeCategory.value = null;
      }
    });
    common_vendor.onMounted(async () => {
      if (productStore.categories.value.length === 0) {
        await productStore.fetchProductsAndCategories();
      }
      if (topCategories.value.length > 0 && !topCategories.value.find((c) => c.id === currentCategory.value)) {
        currentCategory.value = topCategories.value[0].id;
      }
    });
    common_vendor.onPullDownRefresh(async () => {
      await productStore.fetchProductsAndCategories();
      common_vendor.index.stopPullDownRefresh();
    });
    const formatPrice = (price) => {
      return Number(price).toLocaleString("id-ID");
    };
    const topCategories = common_vendor.computed(() => {
      return productStore.categories.value.filter((c) => !c.parentId);
    });
    const activeSubCategories = common_vendor.computed(() => {
      return productStore.categories.value.filter((c) => c.parentId === currentCategory.value);
    });
    const currentCategoryName = common_vendor.computed(() => {
      const cat = topCategories.value.find((c) => c.id === currentCategory.value);
      return cat ? cat.name : "";
    });
    const selectCategory = (catId) => {
      currentCategory.value = catId;
      currentSubCategory.value = null;
    };
    const categoryProducts = common_vendor.computed(() => {
      const allProducts = productStore.allProducts.value;
      if (!allProducts || allProducts.length === 0)
        return [];
      const allCats = productStore.categories.value;
      if (currentSubCategory.value) {
        if (currentSubCategory.value === "others") {
          const existingSubCatIds = allCats.filter((c) => c.parentId === "cat_sticks" && c.id !== "others").map((c) => c.id);
          return allProducts.filter(
            (p) => p.categoryId === "cat_sticks" && !existingSubCatIds.includes(String(p.subCategoryId))
          );
        }
        return allProducts.filter((p) => String(p.subCategoryId) === String(currentSubCategory.value));
      }
      const subCategoryIds = allCats.filter((c) => c.parentId === currentCategory.value).map((c) => c.id);
      return allProducts.filter(
        (p) => p.categoryId === currentCategory.value || subCategoryIds.includes(p.categoryId) || subCategoryIds.includes(String(p.subCategoryId))
      );
    });
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
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: common_vendor.f(common_vendor.unref(topCategories), (cat, k0, i0) => {
          return {
            a: common_vendor.t(cat.name),
            b: cat.id,
            c: common_vendor.o(($event) => selectCategory(cat.id), cat.id),
            d: common_vendor.n(currentCategory.value === cat.id ? "bg-indigo-600 text-white shadow-md" : "bg-gray-100 text-gray-600")
          };
        }),
        b: common_vendor.t(common_vendor.unref(currentCategoryName)),
        c: common_vendor.o(($event) => currentSubCategory.value = null),
        d: common_vendor.n(!currentSubCategory.value ? "border-indigo-600 bg-white text-indigo-600" : "border-transparent text-gray-500"),
        e: common_vendor.f(common_vendor.unref(activeSubCategories), (sub, k0, i0) => {
          return {
            a: common_vendor.t(sub.name),
            b: sub.id,
            c: common_vendor.o(($event) => currentSubCategory.value = sub.id, sub.id),
            d: common_vendor.n(currentSubCategory.value === sub.id ? "border-indigo-600 bg-white text-indigo-600" : "border-transparent text-gray-500")
          };
        }),
        f: common_vendor.unref(categoryProducts).length === 0
      }, common_vendor.unref(categoryProducts).length === 0 ? {} : {
        g: common_vendor.f(common_vendor.unref(categoryProducts), (product, k0, i0) => {
          return common_vendor.e({
            a: product.images && product.images.length > 0
          }, product.images && product.images.length > 0 ? {
            b: common_vendor.unref(utils_config.getImageUrl)(product.images[0])
          } : {}, {
            c: product.isNew
          }, product.isNew ? {} : {}, {
            d: common_vendor.t(product.brand || "Sixhill"),
            e: common_vendor.t(product.name),
            f: common_vendor.t(formatPrice(product.price)),
            g: common_vendor.o(($event) => addToCart(product), product.id),
            h: product.id,
            i: common_vendor.o(($event) => goToDetail(product), product.id)
          });
        })
      });
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-4046d630"], ["__file", "C:/Users/admin/Documents/trae_projects/Jake/miniprogram/src/pages/category/category.vue"]]);
wx.createPage(MiniProgramPage);
