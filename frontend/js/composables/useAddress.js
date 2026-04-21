/**
 * 地址管理逻辑
 */
function useAddress(Vue) {
  const { ref, computed, watch } = Vue;

  const userAddress = ref(localStorage.getItem('userAddress') || '');
  const userLat = ref(localStorage.getItem('userLat') || '');
  const userLng = ref(localStorage.getItem('userLng') || '');
  
  const editingAddress = ref(false);
  const tempAddress = ref('');
  const tempLat = ref('');
  const tempLng = ref('');
  
  const checkoutAddress = ref('');
  const checkoutLat = ref('');
  const checkoutLng = ref('');
  const isEditingCheckoutAddress = ref(false);

  // 初始化 Google Places Autocomplete
  const initAutocomplete = (inputId, callback) => {
    setTimeout(() => {
      const input = document.getElementById(inputId);
      if (!input) return;
      if (!window.google || !window.google.maps || !window.google.maps.places) {
        console.warn("Google Maps Places API is not loaded.");
        return;
      }
      // 避免重复绑定
      if (input.dataset.autocompleteBound) return;
      
      const autocomplete = new window.google.maps.places.Autocomplete(input, {
        fields: ["formatted_address", "geometry", "name"],
        // 如果需要限制国家可以取消注释并修改为目标国家代码，比如 ID (印尼)
        // componentRestrictions: { country: "id" }
      });
      
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (!place.geometry || !place.geometry.location) {
          // 用户按了回车但没有选择下拉项，或找不到经纬度
          return;
        }
        callback({
          address: place.formatted_address || place.name,
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        });
      });
      input.dataset.autocompleteBound = "true";
    }, 100); // 延迟 100ms 确保 DOM (v-if) 已经渲染
  };

  // 监听编辑状态变化，动态绑定 Autocomplete
  watch(editingAddress, (newVal) => {
    if (newVal) {
      initAutocomplete('profileAddressInput', (place) => {
        tempAddress.value = place.address;
        tempLat.value = place.lat;
        tempLng.value = place.lng;
      });
    }
  });

  watch(isEditingCheckoutAddress, (newVal) => {
    if (newVal) {
      initAutocomplete('checkoutAddressInput', (place) => {
        checkoutAddress.value = place.address;
        checkoutLat.value = place.lat;
        checkoutLng.value = place.lng;
      });
    }
  });

  const startEditAddress = () => {
    tempAddress.value = userAddress.value;
    tempLat.value = userLat.value;
    tempLng.value = userLng.value;
    editingAddress.value = true;
  };

  const saveAddress = () => {
    userAddress.value = tempAddress.value;
    userLat.value = tempLat.value;
    userLng.value = tempLng.value;
    localStorage.setItem('userAddress', tempAddress.value);
    if (tempLat.value) localStorage.setItem('userLat', tempLat.value);
    if (tempLng.value) localStorage.setItem('userLng', tempLng.value);
    editingAddress.value = false;
  };

  const googleMapsLink = computed(() => {
    if (userLat.value && userLng.value) {
      return `https://www.google.com/maps/search/?api=1&query=${userLat.value},${userLng.value}`;
    }
    if (!userAddress.value) return '#';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(userAddress.value)}`;
  });

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        tempLat.value = lat;
        tempLng.value = lng;
        
        // 如果有 Google API，则逆地址解析 (Reverse Geocoding) 以获取详细地址
        if (window.google && window.google.maps && window.google.maps.Geocoder) {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === "OK" && results[0]) {
              tempAddress.value = results[0].formatted_address;
            } else {
              tempAddress.value = `${lat}, ${lng}`;
            }
          });
        } else {
          tempAddress.value = `${lat}, ${lng}`;
        }
      },
      (error) => {
        let errorMsg = 'Unable to retrieve your location';
        switch (error.code) {
          case error.PERMISSION_DENIED: errorMsg = 'User denied the request for Geolocation.'; break;
          case error.POSITION_UNAVAILABLE: errorMsg = 'Location information is unavailable.'; break;
          case error.TIMEOUT: errorMsg = 'The request to get user location timed out.'; break;
        }
        alert(`Error: ${errorMsg}`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return {
    userAddress, userLat, userLng,
    editingAddress, tempAddress, tempLat, tempLng,
    checkoutAddress, checkoutLat, checkoutLng,
    isEditingCheckoutAddress, startEditAddress, saveAddress,
    googleMapsLink, getCurrentLocation
  };
}

window.useAddress = useAddress;
