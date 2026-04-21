<template>
  <view class="min-h-screen bg-gray-50 pb-24 relative flex flex-col">
    <!-- Header -->
    <view class="bg-white px-4 py-3 flex justify-between items-center shadow-sm sticky top-0 z-10">
      <text class="text-xl font-bold text-gray-900">Shopping Cart</text>
      <view v-if="cart.length > 0" class="text-gray-500 text-sm py-1 px-2 active:bg-gray-100 rounded" @click="confirmClearCart">
        Clear All
      </view>
    </view>

    <!-- Empty State -->
    <view v-if="cart.length === 0" class="flex-1 flex flex-col items-center justify-center py-20">
      <view class="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <text class="text-4xl">🛒</text>
      </view>
      <text class="text-gray-500 text-base mb-6">Your cart is empty</text>
      <button class="bg-indigo-600 text-white rounded-full px-8 py-2.5 text-sm font-bold shadow-md m-0 border-none after:border-none" @click="goShopping">
        Start Shopping
      </button>
    </view>

    <!-- Cart Items -->
    <scroll-view v-else scroll-y class="flex-1 p-4">
      <view 
        v-for="(item, index) in cart" 
        :key="index"
        class="bg-white rounded-2xl p-3 mb-3 shadow-sm relative flex"
      >
        <!-- Remove Button -->
        <view class="absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-red-50 rounded-full z-10" @click="removeItem(item)">
          <text class="text-red-500 text-xs font-bold">�?/text>
        </view>

        <!-- Product Image -->
        <image 
          :src="getImageUrl(item.images && item.images.length > 0 ? item.images[0] : item.image_url)" 
          mode="aspectFit" 
          class="w-20 h-20 rounded-xl bg-gray-50 border border-gray-100 mr-3 flex-shrink-0 p-1" 
        />

        <!-- Product Details -->
        <view class="flex-1 flex flex-col justify-between py-0.5">
          <view class="pr-6">
            <text class="text-sm font-bold text-gray-900 line-clamp-2 leading-tight mb-1">{{ item.name }}</text>
            
            <!-- Variants -->
            <view class="flex flex-wrap gap-1 mb-1">
              <view v-if="item.selectedColor" class="bg-gray-100 px-2 py-0.5 rounded text-[10px] text-gray-600">
                {{ item.selectedColor }}
              </view>
              <view v-if="item.selectedFlavor && item.selectedFlavor.name" class="bg-gray-100 px-2 py-0.5 rounded text-[10px] text-gray-600">
                {{ item.selectedFlavor.name }}
              </view>
            </view>
            
            <!-- Bundle Flavors -->
            <view v-if="item.bundleFlavors && item.bundleFlavors.length > 0" class="text-[10px] text-gray-500 mb-1">
              <text v-for="f in item.bundleFlavors" :key="f.id" class="block">
                �?{{ f.name }} x{{ f.qty }}
              </text>
            </view>
          </view>

          <!-- Price & Quantity -->
          <view class="flex justify-between items-center mt-2">
            <text class="text-red-600 font-bold text-sm">Rp {{ formatPrice(item.price) }}</text>
            
            <view class="flex items-center border border-gray-200 rounded-lg overflow-hidden h-7">
              <view class="w-7 h-full flex items-center justify-center bg-gray-50 active:bg-gray-100" @click="updateQty(item, -1)">
                <text class="text-gray-600 font-medium">-</text>
              </view>
              <view class="w-8 h-full flex items-center justify-center border-l border-r border-gray-200 bg-white">
                <text class="text-gray-900 text-xs font-medium">{{ item.qty }}</text>
              </view>
              <view class="w-7 h-full flex items-center justify-center bg-gray-50 active:bg-gray-100" @click="updateQty(item, 1)">
                <text class="text-gray-600 font-medium">+</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- Bottom Checkout Bar -->
    <view v-if="cart.length > 0" class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 flex items-center justify-between pb-safe z-40 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      <view class="flex flex-col">
        <text class="text-xs text-gray-500">Total Price</text>
        <text class="text-lg font-bold text-red-600">Rp {{ formatPrice(cartTotal) }}</text>
      </view>
      <button class="bg-indigo-600 text-white rounded-full px-8 py-2.5 text-sm font-bold shadow-md m-0 border-none after:border-none" @click="openCheckout">
        Checkout ({{ cartCount }})
      </button>
    </view>

    <!-- Checkout Modal -->
    <view v-if="showCheckoutModal" class="fixed inset-0 z-50 flex flex-col justify-end">
      <!-- Backdrop -->
      <view class="absolute inset-0 bg-black/50 transition-opacity" @click="closeCheckout"></view>
      
      <!-- Bottom Sheet -->
      <view class="bg-white rounded-t-3xl p-5 relative z-10 flex flex-col max-h-[90vh]">
        <!-- Close Button -->
        <view class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full z-20" @click="closeCheckout">
          <text class="text-gray-500 font-bold">�?/text>
        </view>

        <text class="text-xl font-bold text-gray-900 mb-4">Confirm Order</text>

        <scroll-view scroll-y class="flex-1 min-h-[300px]">
          <!-- Shipping Address -->
          <view class="mb-5">
            <text class="text-sm font-bold text-gray-900 mb-2 block">Shipping Address</text>
            <textarea 
              v-model="shippingAddress" 
              class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm min-h-[80px]" 
              placeholder="Enter your full shipping address..."
              :adjust-position="true"
            />
          </view>

          <!-- Payment Method -->
          <view class="mb-5">
            <text class="text-sm font-bold text-gray-900 mb-2 block">Payment Method</text>
            <view class="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
              <view class="flex items-center justify-between mb-2">
                <text class="font-bold text-indigo-900">Bank Transfer (BCA)</text>
                <text class="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-medium">Selected</text>
              </view>
              <text class="text-sm text-gray-600 block mb-1">Account Name: <text class="font-medium text-gray-900">sieny yunitasari</text></text>
              <text class="text-sm text-gray-600 block">Account Number: <text class="font-bold text-gray-900 text-base tracking-wider">1350642877</text></text>
            </view>
          </view>

          <!-- Upload Receipt -->
          <view class="mb-6">
            <text class="text-sm font-bold text-gray-900 mb-2 block">Payment Receipt (Optional for now)</text>
            <view 
              v-if="!receiptPreview" 
              class="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center bg-gray-50 active:bg-gray-100"
              @click="chooseImage"
            >
              <text class="text-3xl mb-2 text-gray-400">📸</text>
              <text class="text-sm text-indigo-600 font-medium">Tap to upload receipt</text>
              <text class="text-xs text-gray-400 mt-1">JPG, PNG up to 5MB</text>
            </view>
            <view v-else class="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
              <image :src="receiptPreview" mode="aspectFit" class="w-full h-40" />
              <view class="absolute top-2 right-2 bg-black/50 text-white w-8 h-8 rounded-full flex items-center justify-center" @click="clearReceipt">
                <text class="text-sm font-bold">�?/text>
              </view>
            </view>
          </view>
        </scroll-view>

        <!-- Actions -->
        <view class="pt-4 pb-safe mt-auto border-t border-gray-100">
          <view class="flex justify-between items-center mb-4">
            <text class="text-gray-500">Total Payment</text>
            <text class="text-xl font-bold text-red-600">Rp {{ formatPrice(cartTotal) }}</text>
          </view>
          <view class="flex space-x-3">
            <button 
              class="flex-1 bg-gray-100 text-gray-700 rounded-full py-3 text-sm font-bold m-0 border-none after:border-none"
              :disabled="isSubmitting"
              @click="submitOrder('later')"
            >
              Pay Later
            </button>
            <button 
              class="flex-[2] bg-indigo-600 text-white rounded-full py-3 text-sm font-bold shadow-md m-0 border-none after:border-none flex items-center justify-center"
              :disabled="isSubmitting"
              @click="submitOrder('now')"
            >
              <text v-if="isSubmitting" class="mr-2">�?/text>
              {{ isSubmitting ? 'Processing...' : 'Confirm & Pay' }}
            </button>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app';
import { useCartStore, useAuthStore } from '../../store';
import { jsonRequest } from '../../utils/api';
import { getImageUrl, CONFIG } from '../../utils/config';

const cartStore = useCartStore();
const authStore = useAuthStore();

const cart = computed(() => cartStore.cart.value);
const cartTotal = computed(() => cartStore.cartTotal.value);
const cartCount = computed(() => cartStore.cartCount.value);

const showCheckoutModal = ref(false);
const shippingAddress = ref('');
const receiptFile = ref(null);
const receiptPreview = ref('');
const isSubmitting = ref(false);

// Load user address on show if available
onShow(() => {
  cartStore.updateBadge();
  if (authStore.currentUser.value && authStore.currentUser.value.address) {
    shippingAddress.value = authStore.currentUser.value.address;
  }
});

onPullDownRefresh(() => {
  cartStore.updateBadge();
  uni.stopPullDownRefresh();
});

const formatPrice = (price) => {
  return Number(price).toLocaleString('id-ID');
};

const goShopping = () => {
  uni.switchTab({ url: '/pages/index/index' });
};

const confirmClearCart = () => {
  uni.showModal({
    title: 'Clear Cart',
    content: 'Are you sure you want to remove all items from your cart?',
    confirmColor: '#ef4444',
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
    // We update directly and save since it's reactive
    item.qty += change;
    cartStore.saveCart();
  } else if (item.qty + change === 0) {
    removeItem(item);
  }
};

const openCheckout = () => {
  if (!authStore.userToken.value) {
    uni.showModal({
      title: 'Login Required',
      content: 'Please login to checkout your items.',
      confirmText: 'Go to Login',
      success: (res) => {
        if (res.confirm) {
          uni.switchTab({ url: '/pages/profile/profile' });
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
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      receiptPreview.value = res.tempFilePaths[0];
      receiptFile.value = res.tempFilePaths[0];
    }
  });
};

const clearReceipt = () => {
  receiptPreview.value = '';
  receiptFile.value = null;
};

const uploadReceipt = async () => {
  return new Promise((resolve, reject) => {
    if (!receiptFile.value) return resolve(null);
    
    uni.uploadFile({
      url: `${CONFIG.API_BASE}/upload`,
      filePath: receiptFile.value,
      name: 'image',
      header: {
        'Authorization': `Bearer ${authStore.userToken.value}`
      },
      success: (uploadFileRes) => {
        try {
          const data = JSON.parse(uploadFileRes.data);
          if (data.url) {
            resolve(data.url);
          } else {
            reject(new Error('Upload failed: No URL returned'));
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

const submitOrder = async (type = 'later') => {
  if (!shippingAddress.value.trim()) {
    uni.showToast({ title: 'Please enter shipping address', icon: 'none' });
    return;
  }

  if (type === 'now' && !receiptFile.value) {
    uni.showToast({ title: 'Please upload payment receipt', icon: 'none' });
    return;
  }

  isSubmitting.value = true;
  uni.showLoading({ title: 'Processing...', mask: true });

  try {
    // 1. Prepare items
    const orderItems = cart.value.map(item => ({
      productId: item.id,
      quantity: item.qty,
      color: item.selectedColor || null
    }));

    // 2. Create Order
    const orderRes = await jsonRequest('/orders', 'POST', {
      items: orderItems,
      paymentMethod: 'Bank Transfer',
      shippingAddress: shippingAddress.value
    });

    const orderId = orderRes.orderId || orderRes.id;

    // 3. Upload and attach receipt if paying now
    if (type === 'now' && receiptFile.value) {
      const receiptUrl = await uploadReceipt();
      if (receiptUrl) {
        await jsonRequest(`/orders/${orderId}/payment`, 'POST', {
          receiptUrl: receiptUrl
        });
      }
    }

    // 4. Success handling
    uni.hideLoading();
    uni.showToast({
      title: 'Payment Successful!',
      icon: 'success',
      duration: 2000
    });
    
    // Clear cart and close modal
    cartStore.clearCart();
    showCheckoutModal.value = false;
    clearReceipt();
    
    // Redirect to profile to see orders
    setTimeout(() => {
      uni.switchTab({ url: '/pages/profile/profile' });
    }, 1500);

  } catch (err) {
    uni.hideLoading();
    uni.showToast({ title: err.message || 'Failed to place order', icon: 'none' });
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style scoped>
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom);
}
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
