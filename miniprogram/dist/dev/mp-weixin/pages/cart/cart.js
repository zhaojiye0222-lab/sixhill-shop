"use strict";
const common_vendor = require("../../common/vendor.js");
const store_index = require("../../store/index.js");
const utils_api = require("../../utils/api.js");
const utils_config = require("../../utils/config.js");
const _sfc_main = {
  __name: "cart",
  setup(__props) {
    const cartStore = store_index.useCartStore();
    const authStore = store_index.useAuthStore();
    const cart = common_vendor.computed(() => cartStore.cart.value);
    const cartTotal = common_vendor.computed(() => cartStore.cartTotal.value);
    const cartCount = common_vendor.computed(() => cartStore.cartCount.value);
    const showCheckoutModal = common_vendor.ref(false);
    const shippingAddress = common_vendor.ref("");
    const receiptFile = common_vendor.ref(null);
    const receiptPreview = common_vendor.ref("");
    const isSubmitting = common_vendor.ref(false);
    common_vendor.onShow(() => {
      cartStore.updateBadge();
      if (authStore.currentUser.value && authStore.currentUser.value.address) {
        shippingAddress.value = authStore.currentUser.value.address;
      }
    });
    common_vendor.onPullDownRefresh(() => {
      cartStore.updateBadge();
      common_vendor.index.stopPullDownRefresh();
    });
    const formatPrice = (price) => {
      return Number(price).toLocaleString("id-ID");
    };
    const goShopping = () => {
      common_vendor.index.switchTab({ url: "/pages/index/index" });
    };
    const confirmClearCart = () => {
      common_vendor.index.showModal({
        title: "Clear Cart",
        content: "Are you sure you want to remove all items from your cart?",
        confirmColor: "#ef4444",
        success: (res) => {
          if (res.confirm) {
            cartStore.clearCart();
          }
        }
      });
    };
    const removeItem = (item) => {
      cartStore.removeFromCart(item, item.selectedColor, item.selectedFlavor, item.bundleFlavors);
    };
    const updateQty = (item, change) => {
      if (item.qty + change > 0) {
        item.qty += change;
        cartStore.saveCart();
      } else if (item.qty + change === 0) {
        removeItem(item);
      }
    };
    const openCheckout = () => {
      if (!authStore.userToken.value) {
        common_vendor.index.showModal({
          title: "Login Required",
          content: "Please login to checkout your items.",
          confirmText: "Go to Login",
          success: (res) => {
            if (res.confirm) {
              common_vendor.index.switchTab({ url: "/pages/profile/profile" });
            }
          }
        });
        return;
      }
      showCheckoutModal.value = true;
    };
    const closeCheckout = () => {
      if (!isSubmitting.value) {
        showCheckoutModal.value = false;
      }
    };
    const chooseImage = () => {
      common_vendor.index.chooseImage({
        count: 1,
        sizeType: ["compressed"],
        sourceType: ["album", "camera"],
        success: (res) => {
          receiptPreview.value = res.tempFilePaths[0];
          receiptFile.value = res.tempFilePaths[0];
        }
      });
    };
    const clearReceipt = () => {
      receiptPreview.value = "";
      receiptFile.value = null;
    };
    const uploadReceipt = async () => {
      return new Promise((resolve, reject) => {
        if (!receiptFile.value)
          return resolve(null);
        common_vendor.index.uploadFile({
          url: `${utils_config.CONFIG.API_BASE}/upload`,
          filePath: receiptFile.value,
          name: "image",
          header: {
            "Authorization": `Bearer ${authStore.userToken.value}`
          },
          success: (uploadFileRes) => {
            try {
              const data = JSON.parse(uploadFileRes.data);
              if (data.url) {
                resolve(data.url);
              } else {
                reject(new Error("Upload failed: No URL returned"));
              }
            } catch (e) {
              reject(e);
            }
          },
          fail: (err) => {
            reject(err);
          }
        });
      });
    };
    const submitOrder = async (type = "later") => {
      if (!shippingAddress.value.trim()) {
        common_vendor.index.showToast({ title: "Please enter shipping address", icon: "none" });
        return;
      }
      if (type === "now" && !receiptFile.value) {
        common_vendor.index.showToast({ title: "Please upload payment receipt", icon: "none" });
        return;
      }
      isSubmitting.value = true;
      common_vendor.index.showLoading({ title: "Processing..." });
      try {
        const orderItems = cart.value.map((item) => ({
          productId: item.id,
          quantity: item.qty,
          color: item.selectedColor || null
        }));
        const orderRes = await utils_api.jsonRequest("/orders", "POST", {
          items: orderItems,
          paymentMethod: "Bank Transfer",
          shippingAddress: shippingAddress.value
        });
        const orderId = orderRes.orderId || orderRes.id;
        if (type === "now" && receiptFile.value) {
          const receiptUrl = await uploadReceipt();
          if (receiptUrl) {
            await utils_api.jsonRequest(`/orders/${orderId}/payment`, "POST", {
              receiptUrl
            });
          }
        }
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({ title: "Order placed successfully!", icon: "success" });
        cartStore.clearCart();
        showCheckoutModal.value = false;
        clearReceipt();
        setTimeout(() => {
          common_vendor.index.switchTab({ url: "/pages/profile/profile" });
        }, 1500);
      } catch (err) {
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({ title: err.message || "Failed to place order", icon: "none" });
      } finally {
        isSubmitting.value = false;
      }
    };
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: common_vendor.unref(cart).length > 0
      }, common_vendor.unref(cart).length > 0 ? {
        b: common_vendor.o(confirmClearCart)
      } : {}, {
        c: common_vendor.unref(cart).length === 0
      }, common_vendor.unref(cart).length === 0 ? {
        d: common_vendor.o(goShopping)
      } : {
        e: common_vendor.f(common_vendor.unref(cart), (item, index, i0) => {
          return common_vendor.e({
            a: common_vendor.o(($event) => removeItem(item), index),
            b: common_vendor.unref(utils_config.getImageUrl)(item.images && item.images.length > 0 ? item.images[0] : item.image_url),
            c: common_vendor.t(item.name),
            d: item.selectedColor
          }, item.selectedColor ? {
            e: common_vendor.t(item.selectedColor)
          } : {}, {
            f: item.selectedFlavor && item.selectedFlavor.name
          }, item.selectedFlavor && item.selectedFlavor.name ? {
            g: common_vendor.t(item.selectedFlavor.name)
          } : {}, {
            h: item.bundleFlavors && item.bundleFlavors.length > 0
          }, item.bundleFlavors && item.bundleFlavors.length > 0 ? {
            i: common_vendor.f(item.bundleFlavors, (f, k1, i1) => {
              return {
                a: common_vendor.t(f.name),
                b: common_vendor.t(f.qty),
                c: f.id
              };
            })
          } : {}, {
            j: common_vendor.t(formatPrice(item.price)),
            k: common_vendor.o(($event) => updateQty(item, -1), index),
            l: common_vendor.t(item.qty),
            m: common_vendor.o(($event) => updateQty(item, 1), index),
            n: index
          });
        })
      }, {
        f: common_vendor.unref(cart).length > 0
      }, common_vendor.unref(cart).length > 0 ? {
        g: common_vendor.t(formatPrice(common_vendor.unref(cartTotal))),
        h: common_vendor.t(common_vendor.unref(cartCount)),
        i: common_vendor.o(openCheckout)
      } : {}, {
        j: showCheckoutModal.value
      }, showCheckoutModal.value ? common_vendor.e({
        k: common_vendor.o(closeCheckout),
        l: common_vendor.o(closeCheckout),
        m: shippingAddress.value,
        n: common_vendor.o(($event) => shippingAddress.value = $event.detail.value),
        o: !receiptPreview.value
      }, !receiptPreview.value ? {
        p: common_vendor.o(chooseImage)
      } : {
        q: receiptPreview.value,
        r: common_vendor.o(clearReceipt)
      }, {
        s: common_vendor.t(formatPrice(common_vendor.unref(cartTotal))),
        t: isSubmitting.value,
        v: common_vendor.o(($event) => submitOrder("later")),
        w: isSubmitting.value
      }, isSubmitting.value ? {} : {}, {
        x: common_vendor.t(isSubmitting.value ? "Processing..." : "Confirm & Pay"),
        y: isSubmitting.value,
        z: common_vendor.o(($event) => submitOrder("now"))
      }) : {});
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-fb6ea9e5"], ["__file", "C:/Users/admin/Documents/trae_projects/Jake/miniprogram/src/pages/cart/cart.vue"]]);
wx.createPage(MiniProgramPage);
