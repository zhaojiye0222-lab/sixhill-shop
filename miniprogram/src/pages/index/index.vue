<template>
  <view class="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col relative pb-20">
    <!-- Header -->
    <view class="sticky top-0 z-40 bg-white/90 backdrop-blur-md px-4 py-3 flex justify-between items-center shadow-sm">
      <view class="flex items-center space-x-2">
        <view class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
          <text class="text-white font-bold text-lg">J</text>
        </view>
        <text class="font-bold text-xl tracking-tight text-gray-800">Jake</text>
      </view>
      <view class="flex items-center space-x-3 text-gray-600">
        <text class="text-xl">🔍</text>
        <view class="relative">
          <text class="text-xl">🔔</text>
          <view class="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></view>
        </view>
      </view>
    </view>

    <!-- Banner -->
    <view class="px-4 mt-4">
      <view class="w-full h-40 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl relative overflow-hidden shadow-lg flex items-center p-6">
        <view class="relative z-10 w-2/3">
          <text class="text-white/80 text-xs font-bold tracking-wider uppercase mb-1 block">New Arrival</text>
          <text class="text-white text-xl font-bold leading-tight mb-2 block">Experience the Future of Heat-Not-Burn</text>
          <button class="bg-white text-indigo-600 text-xs font-bold px-4 py-1.5 rounded-full inline-block">Shop Now</button>
        </view>
      </view>
    </view>

    <!-- Features -->
    <view class="px-4 mt-6 grid grid-cols-4 gap-3">
      <view class="flex flex-col items-center">
        <view class="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-1.5 shadow-sm">
          <text class="text-2xl">📱</text>
        </view>
        <text class="text-[10px] font-medium text-gray-600 text-center leading-tight">Devices</text>
      </view>
      <view class="flex flex-col items-center">
        <view class="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mb-1.5 shadow-sm">
          <text class="text-2xl">🚬</text>
        </view>
        <text class="text-[10px] font-medium text-gray-600 text-center leading-tight">Sticks</text>
      </view>
      <view class="flex flex-col items-center">
        <view class="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-1.5 shadow-sm">
          <text class="text-2xl">🔌</text>
        </view>
        <text class="text-[10px] font-medium text-gray-600 text-center leading-tight">Accessories</text>
      </view>
      <view class="flex flex-col items-center">
        <view class="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-1.5 shadow-sm">
          <text class="text-2xl">✨</text>
        </view>
        <text class="text-[10px] font-medium text-gray-600 text-center leading-tight">New</text>
      </view>
    </view>

    <!-- Real Products from API -->
    <view class="px-4 mt-8">
      <view class="flex justify-between items-center mb-4">
        <text class="font-bold text-lg text-gray-800">Featured Devices</text>
        <text class="text-xs text-indigo-600 font-medium">See all ></text>
      </view>

      <view v-if="loading" class="text-center py-8 text-gray-400 text-sm">
        <text>Loading products...</text>
      </view>

      <view v-else class="grid grid-cols-2 gap-4">
        <view v-for="(product, index) in featuredProducts" :key="index" class="bg-white rounded-2xl p-3 shadow-sm relative flex flex-col h-full">
          <view class="w-full h-32 bg-gray-100 rounded-xl mb-3 flex items-center justify-center relative overflow-hidden">
            <image v-if="product.images && product.images.length > 0" :src="product.images[0]" mode="aspectFill" class="w-full h-full" />
            <text v-else class="text-3xl text-gray-300">📦</text>
          </view>
          
          <view class="flex-1 flex flex-col justify-between">
            <view>
              <text class="font-bold text-sm text-gray-800 line-clamp-2 leading-snug mb-1">{{ product.name }}</text>
              <text class="text-xs text-gray-400 line-clamp-1 mb-2">{{ product.description }}</text>
            </view>
            <view class="flex justify-between items-center mt-2">
              <text class="font-bold text-red-600 text-sm">Rp {{ formatPrice(product.price) }}</text>
              <view class="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center shadow-md">
                <text class="text-white text-lg leading-none mb-0.5">+</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- Bottom Navigation Bar -->
    <view class="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-100 flex justify-around items-center px-2 z-50 max-w-md mx-auto shadow-[0_-4px_20px_rgba(0,0,0,0.03)] pb-safe">
      <view class="flex flex-col items-center justify-center w-full h-full text-indigo-600">
        <text class="text-2xl mb-0.5">🏠</text>
        <text class="text-[10px] font-medium">Home</text>
      </view>
      <view class="flex flex-col items-center justify-center w-full h-full text-gray-400">
        <text class="text-2xl mb-0.5">🗂️</text>
        <text class="text-[10px] font-medium">Category</text>
      </view>
      <view class="flex flex-col items-center justify-center w-full h-full text-gray-400">
        <text class="text-2xl mb-0.5">🛒</text>
        <text class="text-[10px] font-medium">Cart</text>
      </view>
      <view class="flex flex-col items-center justify-center w-full h-full text-gray-400">
        <text class="text-2xl mb-0.5">👤</text>
        <text class="text-[10px] font-medium">Profile</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const featuredProducts = ref([])
const loading = ref(true)

// 在小程序中使用局域网 IP 代替 localhost，因为手机模拟器可能无法访问 localhost
// 确保你的 Node 后端服务正在运行
const API_BASE_URL = 'http://127.0.0.1:3000/api'

const fetchProducts = () => {
  loading.value = true
  uni.request({
    url: `${API_BASE_URL}/products`,
    method: 'GET',
    success: (res) => {
      console.log('Products fetched:', res.data)
      // 过滤出设备分类作为首页推荐
      const products = res.data || []
      const devices = products.filter(p => p.categoryId === 'cat_devices')
      featuredProducts.value = devices.length > 0 ? devices.slice(0, 4) : products.slice(0, 4)
    },
    fail: (err) => {
      console.error('Failed to fetch products:', err)
      uni.showToast({
        title: 'Failed to load data',
        icon: 'none'
      })
    },
    complete: () => {
      loading.value = false
    }
  })
}

const formatPrice = (price) => {
  return Number(price).toLocaleString('id-ID')
}

// 页面加载时请求数据
onMounted(() => {
  fetchProducts()
})

</script>

<style>
/* Line clamp utility for multiline truncation */
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;  
  overflow: hidden;
}
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;  
  overflow: hidden;
}
</style>