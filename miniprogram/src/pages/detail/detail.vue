<template>
  <view class="min-h-screen bg-gray-50 pb-24 relative">
    <view v-if="loading" class="flex justify-center items-center h-64">
      <text class="text-gray-400">Loading...</text>
    </view>
    
    <template v-else-if="product">
      <!-- Product Images Swiper -->
      <view class="bg-white">
        <swiper class="w-full aspect-square" indicator-dots autoplay circular indicator-active-color="#4f46e5">
          <swiper-item v-if="!product.images || product.images.length === 0">
            <image :src="getImageUrl(product.image_url)" mode="aspectFit" class="w-full h-full bg-gray-50" />
          </swiper-item>
          <template v-else>
            <swiper-item v-for="(img, index) in product.images" :key="index">
              <image :src="getImageUrl(img)" mode="aspectFit" class="w-full h-full bg-gray-50" />
            </swiper-item>
          </template>
        </swiper>
      </view>

      <!-- Product Basic Info -->
      <view class="bg-white p-4 mb-2 shadow-sm">
        <view class="flex justify-between items-start mb-2">
          <text class="text-2xl font-bold text-red-600">Rp {{ formatPrice(product.price) }}</text>
          <view v-if="product.isNew" class="bg-red-500 text-white text-xs px-2 py-1 rounded font-bold">NEW</view>
        </view>
        <text class="text-lg font-bold text-gray-900 leading-tight">{{ product.name }}</text>
        <text class="text-sm text-gray-500 mt-1 block">{{ product.brand || 'Sixhill' }}</text>
      </view>

      <!-- Specifications -->
      <view class="bg-white p-4 mb-2 shadow-sm" @click="openSkuModal">
        <view class="flex justify-between items-center">
          <text class="text-gray-600 text-sm">Select</text>
          <view class="flex items-center flex-1 ml-4 justify-end">
            <text class="text-gray-900 text-sm truncate mr-1">
              {{ selectedColor ? selectedColor : 'Color' }}{{ selectedFlavor ? ', ' + selectedFlavor.name : '' }}
            </text>
            <text class="text-gray-400 text-xs">></text>
          </view>
        </view>
      </view>

      <!-- Product Description -->
      <view class="bg-white p-4 shadow-sm min-h-[300px]">
        <text class="text-base font-bold text-gray-900 mb-3 block">Product Details</text>
        <view class="text-sm text-gray-600 leading-relaxed">
          <!-- Fallback if no rich text -->
          <text v-if="!product.description">No description available.</text>
          <text v-else>{{ product.description }}</text>
        </view>
        <!-- Specs details if available -->
        <view v-if="product.specs" class="mt-4 border-t border-gray-100 pt-4">
          <view v-if="product.specs.battery" class="flex py-2 border-b border-gray-50">
            <text class="w-1/3 text-gray-500 text-sm">Battery</text>
            <text class="w-2/3 text-gray-900 text-sm">{{ product.specs.battery }}</text>
          </view>
          <view v-if="product.specs.heatingTime" class="flex py-2 border-b border-gray-50">
            <text class="w-1/3 text-gray-500 text-sm">Heating Time</text>
            <text class="w-2/3 text-gray-900 text-sm">{{ product.specs.heatingTime }}</text>
          </view>
        </view>
      </view>
    </template>
    
    <view v-else class="flex justify-center items-center h-64">
      <text class="text-gray-400">Product not found</text>
    </view>

    <!-- Bottom Action Bar -->
    <view class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-2 flex items-center justify-between pb-safe z-40 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      <view class="flex items-center space-x-6">
        <view class="flex flex-col items-center justify-center" @click="goHome">
          <text class="text-xl mb-0.5">🏠</text>
          <text class="text-[10px] text-gray-500">Home</text>
        </view>
        <view class="flex flex-col items-center justify-center relative" @click="goToCart">
          <text class="text-xl mb-0.5">🛒</text>
          <text class="text-[10px] text-gray-500">Cart</text>
          <view v-if="cartCount > 0" class="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
            {{ cartCount }}
          </view>
        </view>
      </view>
      <view class="flex space-x-2 flex-1 ml-6">
        <button class="flex-1 bg-indigo-100 text-indigo-600 rounded-full py-2.5 text-sm font-bold m-0 border-none after:border-none" @click="openSkuModal('cart')">Add to Cart</button>
        <button class="flex-1 bg-indigo-600 text-white rounded-full py-2.5 text-sm font-bold m-0 border-none after:border-none shadow-md" @click="openSkuModal('buy')">Buy Now</button>
      </view>
    </view>

    <!-- SKU Bottom Sheet (Variant Selector) -->
    <view v-if="showSkuModal" class="fixed inset-0 z-50 flex flex-col justify-end">
      <!-- Backdrop -->
      <view class="absolute inset-0 bg-black/50 transition-opacity" @click="closeSkuModal"></view>
      
      <!-- Bottom Sheet -->
      <view class="bg-white rounded-t-3xl p-5 relative z-10 flex flex-col max-h-[85vh]">
        <!-- Close Button -->
        <view class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full" @click="closeSkuModal">
          <text class="text-gray-500 font-bold">✕</text>
        </view>

        <!-- Product Summary -->
        <view class="flex items-center mb-6 pr-8">
          <image v-if="product.images && product.images.length > 0" :src="getImageUrl(product.images[0])" mode="aspectFit" class="w-20 h-20 rounded-xl bg-gray-50 border border-gray-100 mr-4 flex-shrink-0 p-1" />
          <image v-else :src="getImageUrl(product.image_url)" mode="aspectFit" class="w-20 h-20 rounded-xl bg-gray-50 border border-gray-100 mr-4 flex-shrink-0 p-1" />
          <view class="flex flex-col">
            <text class="text-red-600 font-bold text-lg">Rp {{ formatPrice(product.price) }}</text>
            <text class="text-sm text-gray-500 mt-1">Stock: {{ product.stock > 0 ? product.stock : 'Out of stock' }}</text>
            <text class="text-xs text-gray-400 mt-1 truncate">Select: {{ selectedColor || 'Color' }}</text>
          </view>
        </view>

        <scroll-view scroll-y class="flex-1 min-h-[200px]">
          <!-- Colors -->
          <view v-if="availableColors.length > 0" class="mb-6">
            <text class="text-sm font-bold text-gray-900 mb-3 block">Color</text>
            <view class="flex flex-wrap gap-2">
              <view 
                v-for="color in availableColors" 
                :key="color"
                @click="selectedColor = color"
                :class="['px-4 py-2 rounded-xl border text-sm transition-all', 
                         selectedColor === color ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-medium' : 'border-gray-200 text-gray-600 bg-white']"
              >
                {{ color }}
              </view>
            </view>
          </view>

          <!-- Flavors (if applicable) -->
          <view v-if="allFlavors && allFlavors.length > 0" class="mb-6">
            <text class="text-sm font-bold text-gray-900 mb-3 block">Flavor / Variant</text>
            <view class="flex flex-col gap-2">
              <view 
                v-for="flavor in allFlavors" 
                :key="flavor.id"
                @click="selectedFlavor = flavor"
                :class="['flex items-center p-2 rounded-xl border transition-all',
                         (selectedFlavor ? selectedFlavor.id : product.id) === flavor.id ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 bg-white']"
              >
                <view class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mr-3 overflow-hidden">
                  <image v-if="flavor.images && flavor.images.length > 0" :src="getImageUrl(flavor.images[0])" mode="aspectFit" class="w-full h-full p-1 bg-white" />
                  <text v-else class="text-lg">🚬</text>
                </view>
                <view class="flex-1 flex flex-col">
                  <text class="text-sm font-medium text-gray-900">{{ flavor.name }}</text>
                </view>
                <view class="w-5 h-5 rounded-full border flex items-center justify-center" :class="(selectedFlavor ? selectedFlavor.id : product.id) === flavor.id ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'">
                  <text v-if="(selectedFlavor ? selectedFlavor.id : product.id) === flavor.id" class="text-white text-xs">✓</text>
                </view>
              </view>
            </view>
          </view>

          <!-- Quantity -->
          <view class="mb-6 flex items-center justify-between">
            <text class="text-sm font-bold text-gray-900">Quantity</text>
            <view class="flex items-center border border-gray-200 rounded-lg overflow-hidden">
              <view class="w-10 h-10 flex items-center justify-center bg-gray-50 active:bg-gray-100" @click="quantity > 1 && quantity--">
                <text class="text-gray-600 text-lg">-</text>
              </view>
              <view class="w-12 h-10 flex items-center justify-center border-l border-r border-gray-200 bg-white">
                <text class="text-gray-900 font-medium">{{ quantity }}</text>
              </view>
              <view class="w-10 h-10 flex items-center justify-center bg-gray-50 active:bg-gray-100" @click="quantity < product.stock && quantity++">
                <text class="text-gray-600 text-lg">+</text>
              </view>
            </view>
          </view>
        </scroll-view>

        <!-- Confirm Button -->
        <view class="pt-4 pb-safe mt-auto">
          <button 
            class="w-full bg-indigo-600 text-white rounded-full py-3 text-base font-bold shadow-lg m-0 border-none after:border-none"
            :class="{'opacity-50': !product.stock || Number(product.stock) <= 0}"
            :disabled="!product.stock || Number(product.stock) <= 0"
            @click.stop="confirmSku"
          >
            {{ product.stock && Number(product.stock) > 0 ? 'Confirm' : 'Out of Stock' }}
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { useProductStore, useCartStore } from '../../store';

const productStore = useProductStore();
const cartStore = useCartStore();

const productId = ref(null);
const product = ref(null);
const loading = ref(true);

const showSkuModal = ref(false);
const skuAction = ref('cart'); // 'cart' or 'buy'
const quantity = ref(1);
const selectedColor = ref('');
const selectedFlavor = ref(null);
const allFlavors = ref([]);

onLoad(async (options) => {
  if (options.id) {
    productId.value = options.id;
    await loadProduct();
  }
});

const loadProduct = async () => {
  loading.value = true;
  // Make sure we have products loaded
  if (productStore.allProducts.value.length === 0) {
    await productStore.fetchProductsAndCategories();
  }
  
  const found = productStore.allProducts.value.find(p => String(p.id) === String(productId.value));
  if (found) {
    product.value = found;
    // Set default color
    if (availableColors.value.length > 0) {
      selectedColor.value = availableColors.value[0];
    }
    
    // Determine flavors (variants under the same subCategory)
    // Only show flavors if it's a device or stick that has siblings
    if (product.value.categoryId === 'cat_devices' || product.value.categoryId === 'cat_sticks') {
      const siblings = productStore.allProducts.value.filter(p => 
        p.categoryId === product.value.categoryId && 
        p.subCategoryId === product.value.subCategoryId &&
        p.id !== product.value.id
      );
      
      if (siblings.length > 0) {
        // Include self and siblings
        allFlavors.value = [product.value, ...siblings];
        selectedFlavor.value = null; // Default to main product
      }
    }
  }
  loading.value = false;
};

const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  return url.startsWith('/') ? `http://8.215.108.239${url}` : `http://8.215.108.239/${url}`;
};

const formatPrice = (price) => {
  return Number(price).toLocaleString('id-ID');
};

const availableColors = computed(() => {
  if (!product.value) return [];
  if (product.value.colors) return product.value.colors.split(',').map(c => c.trim());
  if (product.value.specs && product.value.specs.color) return product.value.specs.color.split(',').map(c => c.trim());
  return [];
});

const cartCount = computed(() => cartStore.cartCount.value);

const goHome = () => {
  uni.switchTab({ url: '/pages/index/index' });
};

const goToCart = () => {
  uni.switchTab({ url: '/pages/cart/cart' });
};

const openSkuModal = (action = 'cart') => {
  skuAction.value = action;
  showSkuModal.value = true;
};

const closeSkuModal = () => {
  showSkuModal.value = false;
};

const confirmSku = () => {
  try {
    if (!selectedColor.value && availableColors.value.length > 0) {
      uni.showToast({ title: 'Please select a color', icon: 'none' });
      return;
    }
    
    const productToAdd = selectedFlavor.value ? selectedFlavor.value : product.value;
    const finalColor = selectedColor.value || 'Default';
    const flavorToSave = (selectedFlavor.value && selectedFlavor.value.id !== product.value.id) ? selectedFlavor.value : null;
    
    if (skuAction.value === 'cart') {
      cartStore.addToCart(productToAdd, quantity.value, finalColor, flavorToSave);
      uni.showToast({ title: 'Added to cart', icon: 'success' });
      closeSkuModal();
    } else {
      cartStore.addToCart(productToAdd, quantity.value, finalColor, flavorToSave);
      closeSkuModal();
      uni.switchTab({ url: '/pages/cart/cart' });
    }
  } catch (e) {
    console.error('confirmSku error:', e);
    uni.showToast({ title: 'Failed: ' + String(e.message || e), icon: 'none' });
  }
};
</script>

<style scoped>
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>