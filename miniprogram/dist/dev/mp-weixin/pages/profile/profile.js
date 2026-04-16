"use strict";
const common_vendor = require("../../common/vendor.js");
const store_index = require("../../store/index.js");
const utils_api = require("../../utils/api.js");
const utils_config = require("../../utils/config.js");
const _sfc_main = {
  __name: "profile",
  setup(__props) {
    const authStore = store_index.useAuthStore();
    const isLoggedIn = common_vendor.computed(() => !!authStore.userToken.value);
    const currentUser = common_vendor.computed(() => authStore.currentUser.value);
    const isRegistering = common_vendor.ref(false);
    const isSubmitting = common_vendor.ref(false);
    const form = common_vendor.reactive({
      username: "",
      password: "",
      name: "",
      phone: "",
      address: "",
      ageConfirmed: false
    });
    const orders = common_vendor.ref([]);
    const isLoadingOrders = common_vendor.ref(false);
    const currentTab = common_vendor.ref("all");
    const orderTabs = [
      { label: "All", value: "all", icon: "📋" },
      { label: "Pending", value: "pending_payment", icon: "💳" },
      { label: "Processing", value: "processing", icon: "⏳" },
      { label: "Paid", value: "paid", icon: "💰" },
      { label: "Shipped", value: "shipped", icon: "🚚" },
      { label: "Completed", value: "completed", icon: "✅" }
    ];
    const currentTabLabel = common_vendor.computed(() => {
      const tab = orderTabs.find((t) => t.value === currentTab.value);
      return tab ? tab.label : "All";
    });
    const filteredOrders = common_vendor.computed(() => {
      if (currentTab.value === "all")
        return orders.value;
      return orders.value.filter((o) => o.status === currentTab.value);
    });
    common_vendor.onShow(() => {
      const cartStore = store_index.useCartStore();
      cartStore.updateBadge();
      if (isLoggedIn.value) {
        fetchOrders();
      }
    });
    const handleSubmit = async () => {
      if (!form.username || !form.password) {
        common_vendor.index.showToast({ title: "Username and password required", icon: "none" });
        return;
      }
      if (isRegistering.value && !form.name) {
        common_vendor.index.showToast({ title: "Name is required", icon: "none" });
        return;
      }
      if (isRegistering.value && !form.ageConfirmed) {
        common_vendor.index.showToast({ title: "You must be 21+ to register", icon: "none" });
        return;
      }
      isSubmitting.value = true;
      common_vendor.index.showLoading({ title: "Processing...", mask: true });
      try {
        if (isRegistering.value) {
          await authStore.register({
            username: form.username,
            password: form.password,
            name: form.name,
            phone: form.phone,
            address: form.address,
            ageConfirmed: true
          });
          common_vendor.index.hideLoading();
          common_vendor.index.showToast({ title: "Registration successful", icon: "success" });
        } else {
          await authStore.login(form.username, form.password);
          common_vendor.index.hideLoading();
          common_vendor.index.showToast({ title: "Login successful", icon: "success" });
        }
        fetchOrders();
      } catch (err) {
        common_vendor.index.hideLoading();
        common_vendor.index.showToast({ title: err.message || "Authentication failed", icon: "none" });
      } finally {
        isSubmitting.value = false;
      }
    };
    const handleLogout = () => {
      common_vendor.index.showModal({
        title: "Logout",
        content: "Are you sure you want to logout?",
        success: (res) => {
          if (res.confirm) {
            authStore.logout();
            orders.value = [];
          }
        }
      });
    };
    const fetchOrders = async () => {
      if (!authStore.userToken.value)
        return;
      isLoadingOrders.value = true;
      try {
        const endpoint = currentUser.value && currentUser.value.role === "admin" ? "/admin/orders" : "/orders";
        const res = await utils_api.jsonRequest(endpoint, "GET");
        orders.value = res.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      } catch (err) {
        console.error("Failed to fetch orders", err);
        common_vendor.index.showToast({ title: "Failed to load orders", icon: "none" });
      } finally {
        isLoadingOrders.value = false;
      }
    };
    const uploadPaymentReceipt = (orderId) => {
      common_vendor.index.chooseImage({
        count: 1,
        sizeType: ["compressed"],
        sourceType: ["album", "camera"],
        success: (res) => {
          const filePath = res.tempFilePaths[0];
          common_vendor.index.showLoading({ title: "Uploading...", mask: true });
          common_vendor.index.uploadFile({
            url: `${utils_config.CONFIG.API_BASE}/upload`,
            filePath,
            name: "image",
            header: {
              "Authorization": `Bearer ${authStore.userToken.value}`
            },
            success: async (uploadFileRes) => {
              try {
                const data = JSON.parse(uploadFileRes.data);
                if (data.url) {
                  await utils_api.jsonRequest(`/orders/${orderId}/payment`, "POST", {
                    receiptUrl: data.url
                  });
                  common_vendor.index.hideLoading();
                  common_vendor.index.showToast({ title: "Receipt uploaded!", icon: "success" });
                  fetchOrders();
                } else {
                  throw new Error("No URL returned");
                }
              } catch (e) {
                common_vendor.index.hideLoading();
                common_vendor.index.showToast({ title: "Upload failed", icon: "none" });
              }
            },
            fail: () => {
              common_vendor.index.hideLoading();
              common_vendor.index.showToast({ title: "Upload failed", icon: "none" });
            }
          });
        }
      });
    };
    const confirmReceipt = (orderId) => {
      common_vendor.index.showModal({
        title: "Confirm Receipt",
        content: "Have you received your package?",
        success: async (res) => {
          if (res.confirm) {
            common_vendor.index.showLoading({ title: "Updating...", mask: true });
            try {
              await utils_api.jsonRequest(`/orders/${orderId}/status`, "PATCH", {
                status: "completed"
              });
              common_vendor.index.hideLoading();
              common_vendor.index.showToast({ title: "Order completed!", icon: "success" });
              fetchOrders();
            } catch (err) {
              common_vendor.index.hideLoading();
              common_vendor.index.showToast({ title: "Failed to update", icon: "none" });
            }
          }
        }
      });
    };
    common_vendor.onPullDownRefresh(async () => {
      if (isLoggedIn.value) {
        await fetchOrders();
      }
      common_vendor.index.stopPullDownRefresh();
    });
    const formatPrice = (price) => {
      const num = Number(price);
      return isNaN(num) ? "0" : num.toLocaleString("id-ID");
    };
    const formatDate = (dateStr) => {
      if (!dateStr)
        return "";
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-GB", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    };
    const formatStatus = (status) => {
      const map = {
        "pending_payment": "Pending Pay",
        "processing": "Processing",
        "paid": "Paid",
        "shipped": "Shipped",
        "completed": "Completed",
        "cancelled": "Cancelled"
      };
      return map[status] || status;
    };
    const getStatusClass = (status) => {
      const map = {
        "pending_payment": "bg-orange-100 text-orange-600",
        "processing": "bg-blue-100 text-blue-600",
        "paid": "bg-indigo-100 text-indigo-600",
        "shipped": "bg-purple-100 text-purple-600",
        "completed": "bg-green-100 text-green-600",
        "cancelled": "bg-red-100 text-red-600"
      };
      return map[status] || "bg-gray-100 text-gray-600";
    };
    const approvePayment = (orderId) => {
      common_vendor.index.showModal({
        title: "Approve Payment",
        content: "Are you sure you want to approve this payment?",
        success: async (res) => {
          if (res.confirm) {
            common_vendor.index.showLoading({ title: "Updating...", mask: true });
            try {
              await utils_api.jsonRequest(`/orders/${orderId}/status`, "PATCH", { status: "paid" });
              common_vendor.index.hideLoading();
              common_vendor.index.showToast({ title: "Payment approved!", icon: "success" });
              fetchOrders();
            } catch (err) {
              common_vendor.index.hideLoading();
              common_vendor.index.showToast({ title: "Failed to update", icon: "none" });
            }
          }
        }
      });
    };
    const rejectPayment = (orderId) => {
      common_vendor.index.showModal({
        title: "Reject Payment",
        content: "Are you sure you want to reject this payment?",
        success: async (res) => {
          if (res.confirm) {
            common_vendor.index.showLoading({ title: "Updating...", mask: true });
            try {
              await utils_api.jsonRequest(`/orders/${orderId}/status`, "PATCH", { status: "pending_payment" });
              common_vendor.index.hideLoading();
              common_vendor.index.showToast({ title: "Payment rejected!", icon: "success" });
              fetchOrders();
            } catch (err) {
              common_vendor.index.hideLoading();
              common_vendor.index.showToast({ title: "Failed to update", icon: "none" });
            }
          }
        }
      });
    };
    const markAsShipped = (orderId) => {
      common_vendor.index.showModal({
        title: "Mark as Shipped",
        content: "Has this order been shipped?",
        success: async (res) => {
          if (res.confirm) {
            common_vendor.index.showLoading({ title: "Updating...", mask: true });
            try {
              await utils_api.jsonRequest(`/orders/${orderId}/status`, "PATCH", { status: "shipped" });
              common_vendor.index.hideLoading();
              common_vendor.index.showToast({ title: "Order marked as shipped!", icon: "success" });
              fetchOrders();
            } catch (err) {
              common_vendor.index.hideLoading();
              common_vendor.index.showToast({ title: "Failed to update", icon: "none" });
            }
          }
        }
      });
    };
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: !common_vendor.unref(isLoggedIn)
      }, !common_vendor.unref(isLoggedIn) ? common_vendor.e({
        b: common_vendor.t(isRegistering.value ? "Create Account" : "Welcome Back"),
        c: common_vendor.t(isRegistering.value ? "Sign up to get started" : "Login to your account"),
        d: form.username,
        e: common_vendor.o(($event) => form.username = $event.detail.value),
        f: form.password,
        g: common_vendor.o(($event) => form.password = $event.detail.value),
        h: isRegistering.value
      }, isRegistering.value ? {
        i: form.name,
        j: common_vendor.o(($event) => form.name = $event.detail.value),
        k: form.phone,
        l: common_vendor.o(($event) => form.phone = $event.detail.value),
        m: form.address,
        n: common_vendor.o(($event) => form.address = $event.detail.value),
        o: form.ageConfirmed,
        p: common_vendor.o((e) => form.ageConfirmed = e.detail.value)
      } : {}, {
        q: common_vendor.t(isSubmitting.value ? "Processing..." : isRegistering.value ? "Sign Up" : "Login"),
        r: isSubmitting.value,
        s: common_vendor.o(handleSubmit),
        t: common_vendor.t(isRegistering.value ? "Already have an account?" : "Don't have an account?"),
        v: common_vendor.t(isRegistering.value ? "Login here" : "Register now"),
        w: common_vendor.o(($event) => isRegistering.value = !isRegistering.value)
      }) : common_vendor.e({
        x: common_vendor.t(common_vendor.unref(currentUser) ? common_vendor.unref(currentUser).name || common_vendor.unref(currentUser).username : ""),
        y: common_vendor.t(common_vendor.unref(currentUser) ? common_vendor.unref(currentUser).phone : "No phone number"),
        z: common_vendor.unref(currentUser) && common_vendor.unref(currentUser).role === "admin"
      }, common_vendor.unref(currentUser) && common_vendor.unref(currentUser).role === "admin" ? {} : {}, {
        A: common_vendor.o(handleLogout),
        B: common_vendor.f(orderTabs, (tab, k0, i0) => {
          return common_vendor.e({
            a: common_vendor.t(tab.icon),
            b: common_vendor.n(currentTab.value === tab.value ? "bg-indigo-50 text-indigo-600" : "bg-gray-50 text-gray-500"),
            c: common_vendor.t(tab.label),
            d: common_vendor.n(currentTab.value === tab.value ? "text-indigo-600" : "text-gray-500"),
            e: currentTab.value === tab.value
          }, currentTab.value === tab.value ? {} : {}, {
            f: tab.value,
            g: common_vendor.o(($event) => currentTab.value = tab.value, tab.value)
          });
        }),
        C: common_vendor.t(common_vendor.unref(currentTabLabel)),
        D: isLoadingOrders.value
      }, isLoadingOrders.value ? {} : common_vendor.unref(filteredOrders).length === 0 ? {} : {
        F: common_vendor.f(common_vendor.unref(filteredOrders), (order, k0, i0) => {
          return common_vendor.e({
            a: common_vendor.t(order.id),
            b: common_vendor.t(formatDate(order.createdAt)),
            c: common_vendor.t(formatStatus(order.status)),
            d: common_vendor.n(getStatusClass(order.status)),
            e: common_vendor.f(order.items, (item, idx, i1) => {
              return common_vendor.e({
                a: item.images && item.images.length > 0
              }, item.images && item.images.length > 0 ? {
                b: common_vendor.unref(utils_config.getImageUrl)(item.images[0])
              } : {}, {
                c: common_vendor.t(item.name),
                d: common_vendor.t(item.color || "Default"),
                e: common_vendor.t(item.quantity),
                f: common_vendor.t(formatPrice(item.priceAtPurchase * item.quantity)),
                g: idx
              });
            }),
            f: common_vendor.t(formatPrice(order.totalAmount)),
            g: order.status === "pending_payment" || order.status === "shipped" || common_vendor.unref(currentUser) && common_vendor.unref(currentUser).role === "admin" && (order.status === "processing" || order.status === "paid")
          }, order.status === "pending_payment" || order.status === "shipped" || common_vendor.unref(currentUser) && common_vendor.unref(currentUser).role === "admin" && (order.status === "processing" || order.status === "paid") ? common_vendor.e({
            h: order.status === "pending_payment"
          }, order.status === "pending_payment" ? {
            i: common_vendor.o(($event) => uploadPaymentReceipt(order.id), order.id)
          } : {}, {
            j: order.status === "shipped"
          }, order.status === "shipped" ? {
            k: common_vendor.o(($event) => confirmReceipt(order.id), order.id)
          } : {}, {
            l: common_vendor.unref(currentUser) && common_vendor.unref(currentUser).role === "admin"
          }, common_vendor.unref(currentUser) && common_vendor.unref(currentUser).role === "admin" ? common_vendor.e({
            m: order.status === "processing"
          }, order.status === "processing" ? {
            n: common_vendor.o(($event) => approvePayment(order.id), order.id)
          } : {}, {
            o: order.status === "processing"
          }, order.status === "processing" ? {
            p: common_vendor.o(($event) => rejectPayment(order.id), order.id)
          } : {}, {
            q: order.status === "paid"
          }, order.status === "paid" ? {
            r: common_vendor.o(($event) => markAsShipped(order.id), order.id)
          } : {}) : {}) : {}, {
            s: order.id
          });
        })
      }, {
        E: common_vendor.unref(filteredOrders).length === 0
      }));
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-04d37cba"], ["__file", "C:/Users/admin/Documents/trae_projects/Jake/miniprogram/src/pages/profile/profile.vue"]]);
wx.createPage(MiniProgramPage);
