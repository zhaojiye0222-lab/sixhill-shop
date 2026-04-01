/**
 * 商品与分类相关状态与逻辑
 */
function useProducts(Vue) {
  const { ref, computed } = Vue;
  const { API_BASE } = window.SixhillAPI;

  const allProducts = ref([]);
  const featuredProducts = ref([]);
  const sticksProducts = ref([]);
  const sticksCategoryGroups = ref([]);
  const bundleProducts = ref([]);
  const categories = ref([]);
  const categoriesDataCache = ref([]);
  const currentCategory = ref('cat_devices');
  const currentSubCategory = ref(null);

  const features = [
    { name: 'HNB Devices', icon: 'ph-device-mobile', color: 'bg-blue-50 text-blue-600', target: 'cat_devices' },
    { name: 'Sticks', icon: 'ph-cigarettes', color: 'bg-orange-50 text-orange-600', target: 'cat_sticks' },
    { name: 'Accessories', icon: 'ph-plug', color: 'bg-purple-50 text-purple-600', target: 'cat_acc' },
    { name: 'New Arrivals', icon: 'ph-sparkle', color: 'bg-rose-50 text-rose-600', target: 'new' },
  ];

  const fetchProductsAndCategories = async () => {
    try {
      const resProducts = await fetch(`${API_BASE}/products`);
      const products = await resProducts.json();

      const parsedProducts = products.map(p => {
        let imgs = p.images;
        if (typeof imgs === 'string') {
          try { imgs = JSON.parse(imgs); } catch (e) { imgs = []; }
        }
        if (!Array.isArray(imgs)) imgs = [];
        return { ...p, images: imgs };
      });
      allProducts.value = parsedProducts;

      let categoriesData = [];
      try {
        const resCategories = await fetch(`${API_BASE}/categories`);
        if (resCategories.ok) {
          categoriesData = await resCategories.json();
          categoriesDataCache.value = categoriesData;
          categories.value = categoriesData.filter(c => !c.parentId);
          if (categories.value.length > 0 && !categories.value.find(c => c.id === currentCategory.value)) {
            currentCategory.value = categories.value[0].id;
          }
        }
      } catch (e) {
        categories.value = [
          { id: 'cat_devices', name: 'Devices' },
          { id: 'cat_sticks', name: 'Sticks' },
          { id: 'cat_acc', name: 'Accessories' }
        ];
      }

      const devices = products.filter(p => p.categoryId === 'cat_devices');
      featuredProducts.value = devices.length > 0 ? devices.slice(0, 4) : products.slice(0, 4);
      bundleProducts.value = products.filter(p => p.categoryId === 'Bundle' || p.categoryId === 'cat_bundle');

      const stickSubCats = categoriesData.filter(c => c.parentId === 'cat_sticks');
      if (stickSubCats.length > 0) {
        const groups = [];
        const groupedProductIds = new Set();
        for (const subCat of stickSubCats) {
          const groupProducts = products.filter(p => String(p.subCategoryId) === String(subCat.id));
          if (groupProducts.length > 0) {
            groups.push({ category: subCat, products: groupProducts });
            groupProducts.forEach(p => groupedProductIds.add(p.id));
          }
        }
        const otherSticks = products.filter(p => p.categoryId === 'cat_sticks' && !groupedProductIds.has(p.id));
        if (otherSticks.length > 0) {
          groups.push({ category: { id: 'others', name: 'Other Sticks' }, products: otherSticks });
        }
        sticksCategoryGroups.value = groups;
      } else {
        sticksProducts.value = products.filter(p => p.categoryId === 'cat_sticks');
        sticksCategoryGroups.value = [{ category: { id: 'all', name: 'All Sticks' }, products: sticksProducts.value }];
      }
    } catch (err) {
      console.error('Failed to load products or categories from API:', err);
    }
  };

  const activeCategoryName = computed(() => {
    const cat = categories.value.find(c => c.id === currentCategory.value);
    return cat ? cat.name : '';
  });

  const activeSubCategories = computed(() => {
    return categoriesDataCache.value.filter(c => c.parentId === currentCategory.value);
  });

  const currentSubCategoryName = computed(() => {
    if (!currentSubCategory.value) return null;
    const subCat = categoriesDataCache.value.find(c => c.id === currentSubCategory.value);
    if (subCat && subCat.name === 'Other Sticks') return 'Others';
    return subCat ? subCat.name : null;
  });

  const categoryProducts = computed(() => {
    if (!allProducts.value || allProducts.value.length === 0) return [];

    if (currentSubCategory.value) {
      if (currentSubCategory.value === 'others') {
        const existingSubCatIds = categoriesDataCache.value
          .filter(c => c.parentId === 'cat_sticks' && c.id !== 'others')
          .map(c => c.id);
        return allProducts.value.filter(p =>
          p.categoryId === 'cat_sticks' && !existingSubCatIds.includes(String(p.subCategoryId))
        );
      }
      return allProducts.value.filter(p => String(p.subCategoryId) === String(currentSubCategory.value));
    }

    const subCategoryIds = categoriesDataCache.value
      .filter(c => c.parentId === currentCategory.value)
      .map(c => c.id);

    return allProducts.value.filter(p =>
      p.categoryId === currentCategory.value ||
      subCategoryIds.includes(p.categoryId) ||
      subCategoryIds.includes(String(p.subCategoryId))
    );
  });

  const searchQuery = ref('');
  const searchResults = computed(() => {
    if (!searchQuery.value.trim()) return [];
    const query = searchQuery.value.toLowerCase();
    return allProducts.value.filter(p =>
      p.name.toLowerCase().includes(query) ||
      (p.description && p.description.toLowerCase().includes(query))
    );
  });

  const getProductName = (id) => {
    if (!id) return 'Unknown Product';
    const prod = allProducts.value.find(p => p.id === id);
    return prod ? prod.name : id;
  };

  return {
    allProducts, featuredProducts, sticksProducts, sticksCategoryGroups, bundleProducts,
    categories, categoriesDataCache, currentCategory, currentSubCategory, features,
    fetchProductsAndCategories, activeCategoryName, activeSubCategories,
    currentSubCategoryName, categoryProducts, searchQuery, searchResults, getProductName
  };
}

window.useProducts = useProducts;
