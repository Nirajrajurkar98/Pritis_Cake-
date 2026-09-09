// ===== DATA STORE =====
const DB = {
  cakes: [],
  users: JSON.parse(localStorage.getItem('pc_users') || '[]'),
  cart: JSON.parse(localStorage.getItem('pc_cart') || '[]'),
  currentUser: JSON.parse(localStorage.getItem('pc_current_user') || 'null')
};

// Admin credentials removed

// ===== SAVE TO STORAGE =====
function saveData() {
  localStorage.setItem('pc_users', JSON.stringify(DB.users));
  localStorage.setItem('pc_cart', JSON.stringify(DB.cart));
  localStorage.setItem('pc_current_user', JSON.stringify(DB.currentUser));
  localStorage.setItem('pc_cakes', JSON.stringify(DB.cakes));
}

  // Load cakes asynchronously via initPromise

// ===== IMAGE HELPERS =====
// Returns the inner HTML for a cake's visual (real image or emoji fallback)
function cakeMedia(cake) {
  if (cake && cake.image) {
    const imgUrl = cake.image.startsWith('http') ? cake.image : `http://localhost:5000${cake.image}`;
    return `<img src="${imgUrl}" alt="${cake.name}">`;
  }
  return (cake && cake.emoji) ? cake.emoji : '🎂';
}

// Reads an uploaded image file and returns a compressed data URL (max dim 800px, JPEG)
function resizeImageFile(file, cb) {
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      const maxDim = 800;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      try { cb(canvas.toDataURL('image/jpeg', 0.8)); }
      catch (err) { cb(e.target.result); }
    };
    img.onerror = () => cb(e.target.result);
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ===== AUTH =====
async function login(email, password) {
  try {
    const data = await api.post('/auth/login', { email, password });
    if (data && data.success) {
      localStorage.setItem('pc_token', data.token);
      
      const profileData = await api.get('/auth/profile');
      if (profileData && profileData.success) {
        // ID compatibility shim for legacy frontend modules
        if (profileData.data && profileData.data._id) {
          profileData.data.id = profileData.data._id;
        }
        localStorage.setItem('pc_current_user', JSON.stringify(profileData.data));
        DB.currentUser = profileData.data;
        return { success: true, role: profileData.data.role };
      }
    }
    return { success: false, msg: data.message || 'Invalid email or password' };
  } catch (error) {
    if (error.status === 401) {
      return { success: false, msg: 'Invalid email or password.' };
    }
    return { success: false, msg: error.message || 'Unable to connect to the server. Please try again.' };
  }
}

async function register(name, email, phone, password) {
  try {
    const data = await api.post('/auth/register', { name, email, password });
    if (data && data.success) {
      // Automatically login after successful registration
      return await login(email, password);
    }
    return { success: false, msg: data.message || 'Registration failed' };
  } catch (error) {
    if (error.status === 409 || (error.message && error.message.toLowerCase().includes('already exists'))) {
      return { success: false, msg: 'An account with this email already exists.' };
    }
    return { success: false, msg: error.message || 'Unable to connect to the server. Please try again.' };
  }
}

function logout() {
  DB.currentUser = null;
  DB.cart = [];
  localStorage.removeItem('pc_token');
  localStorage.removeItem('pc_current_user');
  localStorage.removeItem('pc_admin');
  localStorage.removeItem('pc_cart');
  saveData();
  window.location.href = 'login.html';
}

function isLoggedIn() { 
  return !!localStorage.getItem('pc_token');
}
function isAdmin() { 
  const apiAdmin = JSON.parse(localStorage.getItem('pc_admin') || 'null');
  const token = localStorage.getItem('pc_token');
  if (!token) return false; // Token is strictly required
  
  // Check backend provided role first, fallback to pc_admin
  const currentUser = JSON.parse(localStorage.getItem('pc_current_user') || 'null');
  if (currentUser && currentUser.role === 'admin') return true;
  return !!(apiAdmin && apiAdmin.role === 'admin');
}

async function hydrateSession() {
  const token = localStorage.getItem('pc_token');
  if (token) {
    try {
      const data = await api.get('/auth/profile');
      if (data && data.success) {
        // ID compatibility shim for legacy frontend modules
        if (data.data && data.data._id) {
          data.data.id = data.data._id;
        }
        localStorage.setItem('pc_current_user', JSON.stringify(data.data));
        DB.currentUser = data.data;
      }
    } catch (error) {
      if (error.status === 401) {
        // Invalid or expired token
        localStorage.removeItem('pc_token');
        localStorage.removeItem('pc_current_user');
        DB.currentUser = null;
      }
    }
  } else {
      localStorage.removeItem('pc_current_user');
      DB.currentUser = null;
  }
}

// ===== CART =====
function addToCart(cakeId, qty = 1) {
  if (!isLoggedIn()) { showToast('Please login to add items to cart', 'error'); setTimeout(() => window.location.href = 'login.html', 1500); return; }
  const cake = DB.cakes.find(c => c.id === cakeId);
  if (!cake) return;
  const existing = DB.cart.find(i => i.cakeId === cakeId);
  if (existing) existing.qty += qty;
  else DB.cart.push({ cakeId, qty, name: cake.name, price: cake.price, emoji: cake.emoji, image: cake.image || '' });
  saveData();
  updateCartUI();
  showToast(`${cake.name} added to cart! 🎂`, 'success');
}

function removeFromCart(cakeId) {
  DB.cart = DB.cart.filter(i => i.cakeId !== cakeId);
  saveData();
  updateCartUI();
}

function decreaseQuantity(cakeId) {
  const existing = DB.cart.find(i => i.cakeId === cakeId);
  if (existing) {
    existing.qty -= 1;
    if (existing.qty <= 0) {
      DB.cart = DB.cart.filter(i => i.cakeId !== cakeId);
    }
    saveData();
    updateCartUI();
  }
}

function getCartTotal() { return DB.cart.reduce((sum, i) => sum + (i.price * i.qty), 0); }
function getCartCount() { return DB.cart.reduce((sum, i) => sum + i.qty, 0); }

function updateCartUI() {
  const badge = document.getElementById('cartBadge');
  const count = getCartCount();
  if (badge) { badge.textContent = count; badge.style.display = count > 0 ? 'flex' : 'none'; }
  renderCartItems();
}

function renderCartItems() {
  const container = document.getElementById('cartItems');
  const totalEl = document.getElementById('cartTotal');
  if (!container) return;
  if (DB.cart.length === 0) {
    container.innerHTML = `<div class="cart-empty"><div class="icon">🛒</div><p>Your cart is empty</p></div>`;
    if (totalEl) totalEl.style.display = 'none';
    return;
  }
  if (totalEl) totalEl.style.display = 'block';
  container.innerHTML = DB.cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-img">${item.image ? `<img src="${item.image}" alt="${item.name}">` : item.emoji}</div>
      <div class="cart-item-info">
        <h4>${item.name}</h4>
        <div class="price" style="display:flex;align-items:center;gap:8px">
          ₹${item.price} × 
          <button onclick="decreaseQuantity('${item.cakeId}')" style="background:#eee;border:none;border-radius:4px;padding:2px 6px;cursor:pointer">-</button>
          <span>${item.qty}</span>
          <button onclick="addToCart('${item.cakeId}', 1)" style="background:#eee;border:none;border-radius:4px;padding:2px 6px;cursor:pointer">+</button>
        </div>
        <div style="font-weight:700;color:#e91e8c">₹${item.price * item.qty}</div>
      </div>
      <button class="cart-item-remove" onclick="removeFromCart('${item.cakeId}')">×</button>
    </div>
  `).join('');
  const subtotal = getCartTotal();
  const delivery = subtotal > 0 ? 50 : 0;
  document.getElementById('cartSubtotal').textContent = `₹${subtotal}`;
  document.getElementById('cartDelivery').textContent = `₹${delivery}`;
  document.getElementById('cartGrandTotal').textContent = `₹${subtotal + delivery}`;
}

function toggleCart() {
  const sidebar = document.getElementById('cartSidebar');
  if (sidebar) sidebar.classList.toggle('open');
}

let isPlacingOrder = false;

async function placeOrder() {
  if (isPlacingOrder) return false;
  if (DB.cart.length === 0) { showToast('Cart is empty!', 'error'); return false; }
  if (!isLoggedIn()) { showToast('Please login to place an order', 'error'); return false; }
  
  const btn = document.querySelector('button[onclick="placeOrder()"]');
  if (btn) {
    btn.disabled = true;
    btn.innerText = 'Placing...';
  }
  isPlacingOrder = true;

  try {
    const payload = {
      items: DB.cart.map(item => ({
        cakeId: item.cakeId,
        qty: item.qty
      }))
    };
    
    const res = await api.post('/orders', payload);
    if (res && res.success) {
      DB.cart = [];
      saveData();
      updateCartUI();
      toggleCart();
      showToast('Order placed successfully! 🎂', 'success');
      
      // Attempt to refresh dashboard if we are on the dashboard page
      if (typeof loadClientDashboard === 'function') loadClientDashboard();
      if (typeof loadClientOrders === 'function') loadClientOrders();
      return true;
    }
    return false;
  } catch (err) {
    showToast(err.message || 'Failed to place order. Please try again.', 'error');
    return false;
  } finally {
    isPlacingOrder = false;
    if (btn) {
      btn.disabled = false;
      btn.innerText = 'Place Order 🎂';
    }
  }
}

// ===== TOAST =====
function showToast(msg, type = '') {
  let toast = document.getElementById('toast');
  if (!toast) { toast = document.createElement('div'); toast.id = 'toast'; toast.className = 'toast'; document.body.appendChild(toast); }
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ===== NAV AUTH BUTTONS =====
function updateNavAuth() {
  const navBtns = document.getElementById('navBtns');
  if (!navBtns) return;
  if (isLoggedIn()) {
    navBtns.innerHTML = `
      <div class="cart-btn-wrap">
        <button class="btn btn-outline" onclick="toggleCart()">🛒 Cart</button>
        <span class="cart-badge" id="cartBadge" style="display:none">0</span>
      </div>
      <a href="${isAdmin() ? 'admin-dashboard.html' : 'client-dashboard.html'}" class="btn btn-primary">Dashboard</a>
    `;
  } else {
    navBtns.innerHTML = `
      <a href="login.html" class="btn btn-outline">Login</a>
      <a href="login.html" class="btn btn-primary">Order Now</a>
    `;
  }
  updateCartUI();
}

// ===== HAMBURGER =====
function toggleMobileNav() {
  const nav = document.getElementById('navLinks');
  if (nav) nav.classList.toggle('open');
}

// ===== INIT =====
// Global initialization promise to prevent race conditions across pages
window.initPromise = (async () => {
  await loadCatalog();
  await hydrateSession();
})();

document.addEventListener('DOMContentLoaded', async () => {
  await window.initPromise;
  updateNavAuth();
  const hamburger = document.getElementById('hamburger');
  if (hamburger) hamburger.addEventListener('click', toggleMobileNav);
});

async function loadCatalog() {
  try {
    const res = await api.get('/cakes');
    if (res && Array.isArray(res)) {
      DB.cakes = res.map(cake => {
        cake.id = cake._id; // ID compatibility shim
        return cake;
      });
      // Optionally save to pc_cakes for legacy modules
      localStorage.setItem('pc_cakes', JSON.stringify(DB.cakes));
    }
  } catch (error) {
    console.error("Failed to load catalog from API:", error);
    DB.cakes = [];
    showToast("Catalog currently unavailable. Please try again later.", "error");
  }
}
