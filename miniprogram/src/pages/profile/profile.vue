<template>
  <view class="min-h-screen bg-gray-50 pb-24">
    <!-- Not Logged In State -->
    <view v-if="!isLoggedIn" class="p-6">
      <view class="bg-white rounded-3xl p-6 shadow-sm mt-4">
        <view class="text-center mb-8">
          <text class="text-2xl font-bold text-gray-900 block">{{ isRegistering ? 'Create Account' : 'Welcome Back' }}</text>
          <text class="text-sm text-gray-500 mt-2 block">{{ isRegistering ? 'Sign up to get started' : 'Login to your account' }}</text>
        </view>

        <view class="space-y-4">
          <!-- Username -->
          <view>
            <text class="text-sm font-medium text-gray-700 mb-1 block">Username</text>
            <input v-model="form.username" type="text" class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm" placeholder="Enter username" />
          </view>
          
          <!-- Password -->
          <view>
            <text class="text-sm font-medium text-gray-700 mb-1 block">Password</text>
            <input v-model="form.password" type="password" class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm" placeholder="Enter password" />
          </view>

          <!-- Extra Fields for Registration -->
          <template v-if="isRegistering">
            <view>
              <text class="text-sm font-medium text-gray-700 mb-1 block">Full Name</text>
              <input v-model="form.name" type="text" class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm" placeholder="Enter your name" />
            </view>
            <view>
              <text class="text-sm font-medium text-gray-700 mb-1 block">Phone Number</text>
              <input v-model="form.phone" type="number" class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm" placeholder="Enter phone number" />
            </view>
            <view>
              <text class="text-sm font-medium text-gray-700 mb-1 block">Shipping Address</text>
              <textarea v-model="form.address" class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm min-h-[80px]" placeholder="Enter full address" />
            </view>
            <view class="flex items-center mt-2">
              <switch type="checkbox" :checked="form.ageConfirmed" @change="e => form.ageConfirmed = e.detail.value" color="#4f46e5" style="transform:scale(0.7)" />
              <text class="text-xs text-gray-600 ml-1">I confirm that I am 21+ years old</text>
            </view>
          </template>

          <!-- Submit Button -->
          <button 
            class="w-full bg-indigo-600 text-white rounded-xl py-3.5 text-base font-bold shadow-md mt-6 border-none after:border-none"
            :disabled="isSubmitting"
            @click="handleSubmit"
          >
            {{ isSubmitting ? 'Processing...' : (isRegistering ? 'Sign Up' : 'Login') }}
          </button>

          <!-- Toggle Mode -->
          <view class="text-center mt-4">
            <text class="text-sm text-gray-500">{{ isRegistering ? 'Already have an account?' : "Don't have an account?" }} </text>
            <text class="text-sm text-indigo-600 font-bold" @click="isRegistering = !isRegistering">
              {{ isRegistering ? 'Login here' : 'Register now' }}
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- Logged In State -->
    <template v-else>
      <!-- Header Profile -->
      <view class="bg-indigo-600 px-6 pt-12 pb-8 rounded-b-[40px] text-white shadow-md relative">
        <view class="flex items-center">
          <view class="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center border-2 border-white/40 mr-4">
            <text class="text-3xl">👤</text>
          </view>
          <view class="flex-1">
            <text class="text-xl font-bold block">{{ currentUser ? (currentUser.name || currentUser.username) : '' }}</text>
            <text class="text-indigo-200 text-sm block mt-0.5">{{ currentUser ? currentUser.phone : 'No phone number' }}</text>
            <view v-if="currentUser && currentUser.role === 'admin'" class="inline-block bg-white/20 text-white text-[10px] px-2 py-0.5 rounded mt-1">
              Admin
            </view>
          </view>
          <view class="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center active:bg-white/20" @click="handleLogout">
            <text class="text-sm">🚪</text>
          </view>
        </view>
      </view>

      <!-- Order Tabs -->
      <view class="bg-white mx-4 mt-[-20px] rounded-2xl shadow-sm p-4 relative z-10 flex justify-between items-center">
        <view 
          v-for="tab in orderTabs" 
          :key="tab.value"
          class="flex flex-col items-center relative"
          @click="currentTab = tab.value"
        >
          <view class="w-10 h-10 rounded-full flex items-center justify-center mb-1 transition-colors"
                :class="currentTab === tab.value ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-50 text-gray-500'">
            <text class="text-lg">{{ tab.icon }}</text>
          </view>
          <text class="text-[10px] font-medium" :class="currentTab === tab.value ? 'text-indigo-600' : 'text-gray-500'">{{ tab.label }}</text>
          <view v-if="currentTab === tab.value" class="absolute -bottom-4 w-1 h-1 bg-indigo-600 rounded-full"></view>
        </view>
      </view>

      <!-- Orders List -->
      <view class="p-4">
        <text class="text-base font-bold text-gray-900 mb-4 block">
          {{ currentTabLabel }} Orders
        </text>

        <view v-if="isLoadingOrders" class="flex justify-center py-10">
          <text class="text-gray-400">Loading orders...</text>
        </view>

        <view v-else-if="filteredOrders.length === 0" class="flex flex-col items-center justify-center py-12 bg-white rounded-2xl">
          <text class="text-4xl mb-3 text-gray-300">📦</text>
          <text class="text-gray-500 text-sm">No orders found</text>
        </view>

        <view v-else class="space-y-4">
          <view 
            v-for="order in filteredOrders" 
            :key="order.id"
            class="bg-white rounded-2xl p-4 shadow-sm border border-gray-50"
          >
            <!-- Order Header -->
            <view class="flex justify-between items-center mb-3 pb-3 border-b border-gray-100">
              <view>
                <text class="text-xs text-gray-500 block">Order #{{ order.id }}</text>
                <text class="text-[10px] text-gray-400">{{ formatDate(order.createdAt) }}</text>
              </view>
              <view :class="['px-2 py-1 rounded text-xs font-bold', getStatusClass(order.status)]">
                {{ formatStatus(order.status) }}
              </view>
            </view>

            <!-- Order Items -->
            <view class="space-y-3 mb-3">
              <view v-for="(item, idx) in order.items" :key="idx" class="flex items-center">
                <view class="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center mr-3 border border-gray-100 overflow-hidden p-1">
                  <image v-if="item.images && item.images.length > 0" :src="getImageUrl(item.images[0])" mode="aspectFit" class="w-full h-full" />
                  <text v-else class="text-gray-400 text-xs">📦</text>
                </view>
                <view class="flex-1">
                  <text class="text-sm font-medium text-gray-900 line-clamp-1">{{ item.name }}</text>
                  <text class="text-xs text-gray-500 block mt-0.5">
                    {{ item.color || 'Default' }} x{{ item.quantity }}
                  </text>
                </view>
                <text class="text-sm font-bold text-gray-900">Rp {{ formatPrice(item.priceAtPurchase * item.quantity) }}</text>
              </view>
            </view>

            <!-- Order Footer -->
            <view class="flex justify-between items-center pt-3 border-t border-gray-100">
              <text class="text-sm text-gray-500">Total Amount</text>
              <text class="text-base font-bold text-red-600">Rp {{ formatPrice(order.totalAmount) }}</text>
            </view>

            <!-- Action Buttons -->
            <view class="mt-3 flex space-x-2" v-if="order.status === 'pending_payment' || order.status === 'shipped' || (currentUser && currentUser.role === 'admin' && (order.status === 'processing' || order.status === 'paid'))">
              <button 
                v-if="order.status === 'pending_payment'"
                class="flex-1 bg-indigo-50 text-indigo-600 rounded-xl py-2 text-xs font-bold m-0 border-none after:border-none"
                @click="uploadPaymentReceipt(order.id)"
              >
                Upload Receipt
              </button>
              
              <button 
                v-if="order.status === 'shipped'"
                class="flex-1 bg-indigo-600 text-white rounded-xl py-2 text-xs font-bold shadow-sm m-0 border-none after:border-none"
                @click="confirmReceipt(order.id)"
              >
                Confirm Receipt
              </button>

              <template v-if="currentUser && currentUser.role === 'admin'">
                <button 
                  v-if="order.status === 'processing'"
                  class="flex-1 bg-green-50 text-green-600 rounded-xl py-2 text-xs font-bold m-0 border-none after:border-none"
                  @click="approvePayment(order.id)"
                >
                  Approve Payment
                </button>
                <button 
                  v-if="order.status === 'processing'"
                  class="flex-1 bg-red-50 text-red-600 rounded-xl py-2 text-xs font-bold m-0 border-none after:border-none"
                  @click="rejectPayment(order.id)"
                >
                  Reject Payment
                </button>
                <button 
                  v-if="order.status === 'paid'"
                  class="flex-1 bg-indigo-600 text-white rounded-xl py-2 text-xs font-bold shadow-sm m-0 border-none after:border-none"
                  @click="markAsShipped(order.id)"
                >
                  Mark as Shipped
                </button>
              </template>
            </view>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup>
import { ref, computed, reactive } from 'vue';
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app';
import { useAuthStore, useCartStore } from '../../store';
import { jsonRequest } from '../../utils/api';
import { getImageUrl, CONFIG } from '../../utils/config';

const authStore = useAuthStore();

const isLoggedIn = computed(() => !!authStore.userToken.value);
const currentUser = computed(() => authStore.currentUser.value);

const isRegistering = ref(false);
const isSubmitting = ref(false);

const form = reactive({
  username: '',
  password: '',
  name: '',
  phone: '',
  address: '',
  ageConfirmed: false
});

// Orders state
const orders = ref([]);
const isLoadingOrders = ref(false);
const currentTab = ref('all');

const orderTabs = [
  { label: 'All', value: 'all', icon: '📋' },
  { label: 'Pending', value: 'pending_payment', icon: '💳' },
  { label: 'Processing', value: 'processing', icon: '⏳' },
  { label: 'Paid', value: 'paid', icon: '💰' },
  { label: 'Shipped', value: 'shipped', icon: '🚚' },
  { label: 'Completed', value: 'completed', icon: '✅' }
];

const currentTabLabel = computed(() => {
  const tab = orderTabs.find(t => t.value === currentTab.value);
  return tab ? tab.label : 'All';
});

const filteredOrders = computed(() => {
  if (currentTab.value === 'all') return orders.value;
  return orders.value.filter(o => o.status === currentTab.value);
});

onShow(() => {
  const cartStore = useCartStore();
  cartStore.updateBadge();
  if (isLoggedIn.value) {
    fetchOrders();
  }
});

const handleSubmit = async () => {
  if (!form.username || !form.password) {
    uni.showToast({ title: 'Username and password required', icon: 'none' });
    return;
  }
  if (isRegistering.value && !form.name) {
    uni.showToast({ title: 'Name is required', icon: 'none' });
    return;
  }
  if (isRegistering.value && !form.ageConfirmed) {
    uni.showToast({ title: 'You must be 21+ to register', icon: 'none' });
    return;
  }

  isSubmitting.value = true;
  uni.showLoading({ title: 'Processing...', mask: true });

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
      uni.hideLoading();
      uni.showToast({ title: 'Registration successful', icon: 'success' });
    } else {
      await authStore.login(form.username, form.password);
      uni.hideLoading();
      uni.showToast({ title: 'Login successful', icon: 'success' });
    }
    // Fetch orders after successful login/register
    fetchOrders();
  } catch (err) {
    uni.hideLoading();
    uni.showToast({ title: err.message || 'Authentication failed', icon: 'none' });
  } finally {
    isSubmitting.value = false;
  }
};

const handleLogout = () => {
  uni.showModal({
    title: 'Logout',
    content: 'Are you sure you want to logout?',
    success: (res) => {
      if (res.confirm) {
        authStore.logout();
        orders.value = [];
      }
    }
  });
};

const fetchOrders = async () => {
  if (!authStore.userToken.value) return;
  isLoadingOrders.value = true;
  try {
    // If admin, fetch all orders, else fetch user's orders
    const endpoint = (currentUser.value && currentUser.value.role === 'admin') ? '/admin/orders' : '/orders';
    const res = await jsonRequest(endpoint, 'GET');
    // Sort by createdAt descending
    orders.value = res.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (err) {
    console.error('Failed to fetch orders', err);
    uni.showToast({ title: 'Failed to load orders', icon: 'none' });
  } finally {
    isLoadingOrders.value = false;
  }
};

const uploadPaymentReceipt = (orderId) => {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      const filePath = res.tempFilePaths[0];
      uni.showLoading({ title: 'Uploading...', mask: true });
      
      uni.uploadFile({
        url: `${CONFIG.API_BASE}/upload`,
        filePath: filePath,
        name: 'image',
        header: {
          'Authorization': `Bearer ${authStore.userToken.value}`
        },
        success: async (uploadFileRes) => {
          try {
            const data = JSON.parse(uploadFileRes.data);
            if (data.url) {
              // Link receipt to order
            await jsonRequest(`/orders/${orderId}/payment`, 'POST', {
              receiptUrl: data.url
            });
            uni.hideLoading();
            uni.showToast({ title: 'Payment Successful!', icon: 'success', duration: 2000 });
              fetchOrders();
            } else {
              throw new Error('No URL returned');
            }
          } catch (e) {
            uni.hideLoading();
            uni.showToast({ title: 'Upload failed', icon: 'none' });
          }
        },
        fail: () => {
          uni.hideLoading();
          uni.showToast({ title: 'Upload failed', icon: 'none' });
        }
      });
    }
  });
};

const confirmReceipt = (orderId) => {
  uni.showModal({
    title: 'Confirm Receipt',
    content: 'Have you received your package?',
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: 'Updating...', mask: true });
        try {
          await jsonRequest(`/orders/${orderId}/status`, 'PATCH', {
            status: 'completed'
          });
          uni.hideLoading();
          uni.showToast({ title: 'Order completed!', icon: 'success' });
          fetchOrders();
        } catch (err) {
          uni.hideLoading();
          uni.showToast({ title: 'Failed to update', icon: 'none' });
        }
      }
    }
  });
};

// Helpers

onPullDownRefresh(async () => {
  if (isLoggedIn.value) {
    await fetchOrders();
  }
  uni.stopPullDownRefresh();
});

const formatPrice = (price) => {
  const num = Number(price);
  return isNaN(num) ? '0' : num.toLocaleString('id-ID');
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', { 
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

const formatStatus = (status) => {
  const map = {
    'pending_payment': 'Pending Pay',
    'processing': 'Processing',
    'paid': 'Paid',
    'shipped': 'Shipped',
    'completed': 'Completed',
    'cancelled': 'Cancelled'
  };
  return map[status] || status;
};

const getStatusClass = (status) => {
  const map = {
    'pending_payment': 'bg-orange-100 text-orange-600',
    'processing': 'bg-blue-100 text-blue-600',
    'paid': 'bg-indigo-100 text-indigo-600',
    'shipped': 'bg-purple-100 text-purple-600',
    'completed': 'bg-green-100 text-green-600',
    'cancelled': 'bg-red-100 text-red-600'
  };
  return map[status] || 'bg-gray-100 text-gray-600';
};

const approvePayment = (orderId) => {
  uni.showModal({
    title: 'Approve Payment',
    content: 'Are you sure you want to approve this payment?',
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: 'Updating...', mask: true });
        try {
          await jsonRequest(`/orders/${orderId}/status`, 'PATCH', { status: 'paid' });
          uni.hideLoading();
          uni.showToast({ title: 'Payment approved!', icon: 'success' });
          fetchOrders();
        } catch (err) {
          uni.hideLoading();
          uni.showToast({ title: 'Failed to update', icon: 'none' });
        }
      }
    }
  });
};

const rejectPayment = (orderId) => {
  uni.showModal({
    title: 'Reject Payment',
    content: 'Are you sure you want to reject this payment?',
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: 'Updating...', mask: true });
        try {
          await jsonRequest(`/orders/${orderId}/status`, 'PATCH', { status: 'pending_payment' });
          uni.hideLoading();
          uni.showToast({ title: 'Payment rejected!', icon: 'success' });
          fetchOrders();
        } catch (err) {
          uni.hideLoading();
          uni.showToast({ title: 'Failed to update', icon: 'none' });
        }
      }
    }
  });
};

const markAsShipped = (orderId) => {
  uni.showModal({
    title: 'Mark as Shipped',
    content: 'Has this order been shipped?',
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: 'Updating...', mask: true });
        try {
          await jsonRequest(`/orders/${orderId}/status`, 'PATCH', { status: 'shipped' });
          uni.hideLoading();
          uni.showToast({ title: 'Order marked as shipped!', icon: 'success' });
          fetchOrders();
        } catch (err) {
          uni.hideLoading();
          uni.showToast({ title: 'Failed to update', icon: 'none' });
        }
      }
    }
  });
};
</script>

<style scoped>
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>