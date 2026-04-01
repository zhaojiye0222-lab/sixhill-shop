/**
 * 认证相关状态与逻辑
 */
function useAuth(Vue) {
  const { ref } = Vue;
  const { API_BASE } = window.SixhillAPI;

  const showLoginModal = ref(false);
  const isLoggingIn = ref(false);
  const loginError = ref('');
  const showPassword = ref(false);
  const loginForm = ref({ username: '', password: '' });
  const userToken = ref(localStorage.getItem('userToken') || '');
  const currentUser = ref(JSON.parse(localStorage.getItem('currentUser') || 'null'));

  // 检查 URL 参数是否需要打开登录框
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('action') === 'login') {
    showLoginModal.value = true;
    const tabParam = urlParams.get('tab');
    const newUrl = window.location.pathname + (tabParam ? `?tab=${tabParam}` : '');
    window.history.replaceState({}, document.title, newUrl);
  }

  // 清理可能的坏缓存
  try {
    if (localStorage.getItem('user')) {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
  } catch (e) {}

  const handleLogin = async (fetchMyOrders) => {
    isLoggingIn.value = true;
    loginError.value = '';
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginForm.value.username,
          password: loginForm.value.password
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      userToken.value = data.token;
      currentUser.value = data.user;
      localStorage.setItem('userToken', data.token);
      localStorage.setItem('currentUser', JSON.stringify(data.user));

      showLoginModal.value = false;
      loginForm.value = { username: '', password: '' };
      if (fetchMyOrders) fetchMyOrders();
    } catch (err) {
      loginError.value = err.message;
    } finally {
      isLoggingIn.value = false;
    }
  };

  const doLogout = () => {
    userToken.value = null;
    currentUser.value = null;
    localStorage.removeItem('userToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return {
    showLoginModal, isLoggingIn, loginError, showPassword, loginForm,
    userToken, currentUser, handleLogin, doLogout
  };
}

window.useAuth = useAuth;
