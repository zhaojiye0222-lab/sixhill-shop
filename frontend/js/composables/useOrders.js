/**
 * 订单相关状态与逻辑
 */
function useOrders(Vue, deps) {
  const { ref, computed } = Vue;
  const { userToken, currentUser, cart, isCheckingOut, showCheckoutModal,
          paymentModalData, receiptPreview, receiptFile, checkoutAddress,
          isEditingCheckoutAddress, showOrderHistory, orderStatusFilter } = deps;
  const { API_BASE } = window.SixhillAPI;

  const myOrders = ref([]);

  const fetchMyOrders = async () => {
    if (!userToken.value) return;
    try {
      const res = await fetch(`${API_BASE}/orders`, {
        headers: { 'Authorization': `Bearer ${userToken.value}` }
      });
      if (res.ok) {
        myOrders.value = await res.json();
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  };

  const adminProcessingOrders = computed(() => {
    if (!currentUser.value || currentUser.value.role !== 'admin') return [];
    return myOrders.value.filter(order => order.status === 'processing');
  });

  const filteredOrders = computed(() => {
    const activeOrders = myOrders.value.filter(order =>
      order.status !== 'cancelled' && order.status !== 'refunded' && order.status !== 'deleted'
    );
    if (orderStatusFilter.value === 'all') return activeOrders;
    if (orderStatusFilter.value === 'processing') {
      return activeOrders.filter(order => order.status === 'processing' || order.status === 'paid');
    }
    if (orderStatusFilter.value === 'completed') {
      return activeOrders.filter(order => ['completed', 'delivered', 'review'].includes(order.status));
    }
    return activeOrders.filter(order => order.status === orderStatusFilter.value);
  });

  const getOrdersCountByStatus = (status) => {
    if (['cancelled', 'refunded', 'deleted'].includes(status)) return 0;
    if (status === 'completed') {
      return myOrders.value.filter(order => ['completed', 'delivered', 'review'].includes(order.status)).length;
    }
    return myOrders.value.filter(order => order.status === status).length;
  };

  const filterOrders = (status) => {
    orderStatusFilter.value = status;
    showOrderHistory.value = true;
  };

  const cancelOrder = async (orderId, currentStatus) => {
    let confirmMsg = 'Are you sure you want to cancel this order?';
    if (['cancelled', 'refunded', 'completed', 'delivered', 'review'].includes(currentStatus)) {
      confirmMsg = 'Are you sure you want to permanently delete this order record?';
    }
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${userToken.value}` }
      });
      if (res.ok) {
        alert('Order deleted successfully!');
        myOrders.value = myOrders.value.filter(o => o.orderId !== orderId);
        await fetchMyOrders();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update order.');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const confirmReceipt = async (orderId) => {
    if (!confirm('Have you received the package?')) return;
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken.value}`
        },
        body: JSON.stringify({ status: 'completed' })
      });
      if (res.ok) {
        alert('Thank you! You can now review your items.');
        const order = myOrders.value.find(o => o.orderId === orderId);
        if (order) order.status = 'completed';
        orderStatusFilter.value = 'completed';
        showOrderHistory.value = true;
        await fetchMyOrders();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to confirm receipt');
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    }
  };

  const confirmOrderPayment = async (orderId) => {
    if (!confirm('Are you sure you want to mark this order as paid?')) return;
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken.value}`
        },
        body: JSON.stringify({ status: 'paid' })
      });
      if (res.ok) {
        alert('Order marked as paid successfully!');
        fetchMyOrders();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update order status.');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const checkoutCart = () => {
    if (cart.value.length === 0) return;
    if (!userToken.value) {
      alert('Please login first to checkout.');
      return 'need_login';
    }
    if (!localStorage.getItem('userAddress') && currentUser.value && currentUser.value.address) {
      localStorage.setItem('userAddress', currentUser.value.address);
    }
    paymentModalData.value = null;
    receiptPreview.value = null;
    receiptFile.value = null;
    isEditingCheckoutAddress.value = false;
    checkoutAddress.value = localStorage.getItem('userAddress') || '';
    showCheckoutModal.value = true;
  };

  const continuePayment = (order) => {
    paymentModalData.value = order;
    receiptPreview.value = null;
    receiptFile.value = null;
    showCheckoutModal.value = true;
  };

  const closePaymentModal = () => {
    showCheckoutModal.value = false;
    paymentModalData.value = null;
    receiptPreview.value = null;
    receiptFile.value = null;
  };

  const handleReceiptUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      receiptFile.value = file;
      const reader = new FileReader();
      reader.onload = (e) => { receiptPreview.value = e.target.result; };
      reader.readAsDataURL(file);
    }
  };

  const payLater = async () => {
    if (paymentModalData.value) { closePaymentModal(); return; }

    isCheckingOut.value = true;
    try {
      const orderItems = cart.value.map(item => ({
        productId: item.id, quantity: item.qty, color: item.selectedColor || null
      }));
      
      const { checkoutLat, checkoutLng } = deps;
      let finalAddress = checkoutAddress.value;
      if (checkoutLat && checkoutLng && checkoutLat.value && checkoutLng.value) {
        finalAddress += ` (Lat: ${checkoutLat.value}, Lng: ${checkoutLng.value})`;
      }

      const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken.value}` },
        body: JSON.stringify({ items: orderItems, paymentMethod: 'bank_transfer', shippingAddress: finalAddress })
      });
      if (!res.ok) throw new Error('Checkout failed');

      alert('Order saved as Pending. You can pay later in your Profile.');
      cart.value = [];
      closePaymentModal();
      orderStatusFilter.value = 'pending_payment';
      showOrderHistory.value = true;
      fetchMyOrders();
      return 'go_profile';
    } catch (err) {
      alert('Error creating order.');
    } finally {
      isCheckingOut.value = false;
    }
  };

  const confirmCheckout = async () => {
    if (!receiptFile.value) { alert('Please upload your payment receipt first.'); return; }

    isCheckingOut.value = true;
    try {
      const formData = new FormData();
      formData.append('image', receiptFile.value);
      const uploadRes = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${userToken.value}` },
        body: formData
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Failed to upload receipt');
      const receiptUrl = uploadData.url;

      if (paymentModalData.value) {
        const res = await fetch(`${API_BASE}/orders/${paymentModalData.value.orderId}/payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken.value}` },
          body: JSON.stringify({ receiptUrl })
        });
        if (res.ok) {
          alert('Payment receipt uploaded successfully!');
          showCheckoutModal.value = false;
          fetchMyOrders();
        } else {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to submit payment');
        }
        return;
      }

      const orderItems = cart.value.map(item => ({
        productId: item.id, quantity: item.qty, color: item.selectedColor || null
      }));
      
      const { checkoutLat, checkoutLng } = deps;
      let finalAddress = checkoutAddress.value;
      if (checkoutLat && checkoutLng && checkoutLat.value && checkoutLng.value) {
        finalAddress += ` (Lat: ${checkoutLat.value}, Lng: ${checkoutLng.value})`;
      }

      const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken.value}` },
        body: JSON.stringify({ items: orderItems, paymentMethod: 'bank_transfer', shippingAddress: finalAddress })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout failed');

      const paymentRes = await fetch(`${API_BASE}/orders/${data.orderId}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken.value}` },
        body: JSON.stringify({ receiptUrl })
      });
      if (!paymentRes.ok) throw new Error('Order created, but failed to link receipt.');

      showCheckoutModal.value = false;
      alert('Order placed and paid successfully!');
      cart.value = [];
      showOrderHistory.value = true;
      fetchMyOrders();
      return 'go_profile';
    } catch (err) {
      alert(err.message);
    } finally {
      isCheckingOut.value = false;
    }
  };

  return {
    myOrders, fetchMyOrders, adminProcessingOrders, filteredOrders,
    getOrdersCountByStatus, filterOrders, cancelOrder, confirmReceipt,
    confirmOrderPayment, checkoutCart, continuePayment, closePaymentModal,
    handleReceiptUpload, payLater, confirmCheckout
  };
}

window.useOrders = useOrders;
