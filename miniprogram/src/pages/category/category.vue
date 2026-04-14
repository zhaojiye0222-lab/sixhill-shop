<template>
  <view class="h-full bg-white flex flex-col overflow-hidden">
    <!-- Top Category Navigation -->
    <view class="bg-white border-b border-gray-100 shadow-sm z-10 sticky top-0 flex-shrink-0">
      <scroll-view scroll-x class="whitespace-nowrap px-2 py-3" :show-scrollbar="false">
        <view 
          v-for="cat in topCategories" 
          :key="cat.id"
          @click="selectCategory(cat.id)"
          :class="['inline-block px-4 py-1.5 rounded-full text-sm font-medium mr-2 transition-colors', 
                   currentCategory === cat.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-600']"
        >
          {{ cat.name }}
        </view>
      </scroll-view>
    </view>

    <!-- Main Content Area -->
    <view class="flex-1 flex overflow-hidden">
      <!-- Left Sidebar for Subcategories -->
      <scroll-view 
        scroll-y 
        class="w-24 bg-gray-50 flex-shrink-0 border-r border-gray-100 h-full"
      >
        <view 
          @click="currentSubCategory = null"
          :class="['py-4 px-3 text-xs font-medium text-center border-l-2 transition-colors', 
                   !currentSubCategory ? 'border-indigo-600 bg-white text-indigo-600' : 'border-transparent text-gray-500']"
        >
          All {{ currentCategoryName }}
        </view>
        <view 
          v-for="sub in activeSubCategories" 
          :key="sub.id"
          @click="currentSubCategory = sub.id"
          :class="['py-4 px-3 text-xs font-medium text-center border-l-2 transition-colors', 
                   currentSubCategory === sub.id ? 'border-indigo-600 bg-white text-indigo-600' : 'border-transparent text-gray-500']"
        >
          {{ sub.name }}
        </view>
      </scroll-view>

      <!-- Right Content Area for Products -->
      <scroll-view scroll-y class="flex-1 bg-white h-full p-3">
        <view v-if="categoryProducts.length === 0" class="flex flex-col items-center justify-center py-20">
          <text class="text-4xl mb-4">📦</text>
          <text class="text-gray-400 text-sm">No products found</text>
        </view>
        
        <view v-else class="grid grid-cols-2 gap-3 pb-20">
          <view 
            v-for="product in categoryProducts" 
            :key="product.id"
            @click="goToDetail(product)"
            class="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 flex flex-col"
          >
            <!-- Product Image -->
            <view class="w-full aspect-square bg-gray-50 relative">
              <image 
                v-if="product.images && product.images.length > 0"
                :src="getImageUrl(product.images[0])" 
                mode="aspectFit"
                class="w-full h-full p-2"
              />
              <!-- Optional: Badge -->
              <view v-if="product.isNew" class="absolute top-2 left-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                NEW
              </view>
            </view>
            
            <!-- Product Info -->
            <view class="p-2.5 flex-1 flex flex-col">
              <text class="text-xs text-gray-500 mb-0.5">{{ product.brand || 'Sixhill' }}</text>
              <text class="text-sm font-bold text-gray-900 line-clamp-2 leading-tight flex-1">{{ product.name }}</text>
              <view class="mt-2 flex items-center justify-between">
                <text class="text-red-600 font-bold text-sm">Rp {{ formatPrice(product.price) }}</text>
                <view 
                  @click.stop="addToCart(product)"
                  class="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md active:bg-indigo-700"
                >
                  <text class="text-lg leading-none mt-[-2px]">+</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useProductStore, useCartStore } from '../../store';

const productStore = useProductStore();
const cartStore = useCartStore();

const currentCategory = ref('cat_devices');
const currentSubCategory = ref(null);

onShow(() => {
  if (productStore.activeCategory.value) {
    currentCategory.value = productStore.activeCategory.value;
    currentSubCategory.value = null;
    productStore.activeCategory.value = null; // reset after applying
  }
});

onMounted(async () => {
  if (productStore.categories.value.length === 0) {
    await productStore.fetchProductsAndCategories();
  }
  // Set default category
  if (topCategories.value.length > 0 && !topCategories.value.find(c => c.id === currentCategory.value)) {
    currentCategory.value = topCategories.value[0].id;
  }
});

const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  return url.startsWith('/') ? `http://8.215.108.239${url}` : `http://8.215.108.239/${url}`;
};

const formatPrice = (price) => {
  return Number(price).toLocaleString('id-ID');
};

const topCategories = computed(() => {
  return productStore.categories.value.filter(c => !c.parentId);
});

const activeSubCategories = computed(() => {
  return productStore.categories.value.filter(c => c.parentId === currentCategory.value);
});

const currentCategoryName = computed(() => {
  const cat = topCategories.value.find(c => c.id === currentCategory.value);
  return cat ? cat.name : '';
});

const selectCategory = (catId) => {
  currentCategory.value = catId;
  currentSubCategory.value = null;
};

const categoryProducts = computed(() => {
  const allProducts = productStore.allProducts.value;
  if (!allProducts || allProducts.length === 0) return [];

  const allCats = productStore.categories.value;

  if (currentSubCategory.value) {
    if (currentSubCategory.value === 'others') {
      const existingSubCatIds = allCats
        .filter(c => c.parentId === 'cat_sticks' && c.id !== 'others')
        .map(c => c.id);
      return allProducts.filter(p =>
        p.categoryId === 'cat_sticks' && !existingSubCatIds.includes(String(p.subCategoryId))
      );
    }
    return allProducts.filter(p => String(p.subCategoryId) === String(currentSubCategory.value));
  }

  const subCategoryIds = allCats
    .filter(c => c.parentId === currentCategory.value)
    .map(c => c.id);

  return allProducts.filter(p =>
    p.categoryId === currentCategory.value ||
    subCategoryIds.includes(p.categoryId) ||
    subCategoryIds.includes(String(p.subCategoryId))
  );
});

const goToDetail = (product) => {
  uni.navigateTo({
    url: `/pages/detail/detail?id=${product.id}`
  });
};

const addToCart = (product) => {
  const color = product.colors ? product.colors.split(',')[0] : 'Default';
  cartStore.addToCart(product, 1, color);
  uni.showToast({
    title: 'Added to cart',
    icon: 'success'
  });
};
</script>

<style scoped>
/* Hide scrollbar */
::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
  color: transparent;
}
</style>