/**
 * 地址管理逻辑
 */
function useAddress(Vue) {
  const { ref, computed } = Vue;

  const userAddress = ref(localStorage.getItem('userAddress') || '');
  const editingAddress = ref(false);
  const tempAddress = ref('');
  const checkoutAddress = ref('');
  const isEditingCheckoutAddress = ref(false);

  const startEditAddress = () => {
    tempAddress.value = userAddress.value;
    editingAddress.value = true;
  };

  const saveAddress = () => {
    userAddress.value = tempAddress.value;
    localStorage.setItem('userAddress', tempAddress.value);
    editingAddress.value = false;
  };

  const googleMapsLink = computed(() => {
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
        tempAddress.value = `${position.coords.latitude}, ${position.coords.longitude}`;
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
    userAddress, editingAddress, tempAddress, checkoutAddress,
    isEditingCheckoutAddress, startEditAddress, saveAddress,
    googleMapsLink, getCurrentLocation
  };
}

window.useAddress = useAddress;
