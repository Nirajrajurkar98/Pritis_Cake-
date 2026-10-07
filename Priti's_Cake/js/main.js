// ===== DATA STORE =====
const DB = {
  cakes: [],
  users: [],
  cart: JSON.parse(localStorage.getItem('pc_cart') || '[]'),
  currentUser: JSON.parse(localStorage.getItem('pc_current_user') || 'null')
};

// Admin credentials removed

// ===== SAVE TO STORAGE =====
function saveData() {
  localStorage.setItem('pc_cart', JSON.stringify(DB.cart));
  localStorage.setItem('pc_current_user', JSON.stringify(DB.currentUser));
}

// ===== LOAD CAKES FROM API =====
let isCakesLoaded = false;
let cakesError = false;

async function loadCakesFromAPI() {
  try {
    let data;
    // Fallback to fetch if api.js is not loaded
    if (typeof api !== 'undefined' && api.get) {
      data = await api.get('/cakes');
    } else {
      const response = await fetch('http://localhost:5000/api/cakes');
      if (!response.ok) throw new Error('Failed to load cakes');
      data = await response.json();
    }
    
    // Convert _id to id so we don't break existing frontend code
    DB.cakes = data.map(cake => ({
      ...cake,
      id: cake._id,
      // Fix relative image paths if necessary
      image: cake.image ? (cake.image.startsWith('http') ? cake.image : `http://localhost:5000${cake.image}`) : ''
    }));
    
    isCakesLoaded = true;
    window.dispatchEvent(new Event('cakesLoaded'));
  } catch (error) {
    console.error(error);
    cakesError = true;
    window.dispatchEvent(new Event('cakesError'));
  }
}

// ===== IMAGE HELPERS =====
// Returns the inner HTML for a cake's visual (real image or emoji fallback)
function cakeMedia(cake) {
  if (cake && cake.image) return `<img src="${cake.image}" alt="${cake.name}">`;
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
// Login is now handled via API directly in login.html

// Registration is now handled via API directly in login.html

function logout() {
  DB.currentUser = null;
  localStorage.removeItem('pc_token');
  localStorage.removeItem('pc_current_user');
  window.location.href = 'login.html';
}

function isLoggedIn() { return DB.currentUser !== null; }
function isAdmin() { 
  const apiAdmin = JSON.parse(localStorage.getItem('pc_admin') || 'null');
  const token = localStorage.getItem('pc_token');
  return !!(token && apiAdmin && apiAdmin.role === 'admin');
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

function updateCartItemQty(cakeId, delta) {
  const item = DB.cart.find(i => i.cakeId === cakeId);
  if (!item) return;
  const newQty = item.qty + delta;
  if (newQty >= 1) {
    item.qty = newQty;
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
    container.innerHTML = `<div class="cart-empty"><p>Your cart is empty</p></div>`;
    if (totalEl) totalEl.style.display = 'none';
    return;
  }
  if (totalEl) totalEl.style.display = 'block';
  container.innerHTML = DB.cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-img">${item.image ? `<img src="${item.image}" alt="${item.name}">` : item.emoji}</div>
      <div class="cart-item-info">
        <h4>${item.name}</h4>
        <div class="price">₹${item.price}</div>
        <div style="display:flex; align-items:center; gap:10px; margin-top:6px;">
          <div style="display:flex; align-items:center; border:1px solid #ddd; border-radius:4px; overflow:hidden;">
            <button onclick="updateCartItemQty('${item.cakeId}', -1)" style="padding:2px 10px; background:#f8f9fa; border:none; border-right:1px solid #ddd; cursor:pointer;" aria-label="Decrease quantity">−</button>
            <span style="padding:2px 12px; font-size:0.9rem; min-width:1ch; text-align:center;">${item.qty}</span>
            <button onclick="updateCartItemQty('${item.cakeId}', 1)" style="padding:2px 10px; background:#f8f9fa; border:none; border-left:1px solid #ddd; cursor:pointer;" aria-label="Increase quantity">+</button>
          </div>
          <div style="font-weight:700;color:#e91e8c">₹${item.price * item.qty}</div>
        </div>
      </div>
      <button class="cart-item-remove" onclick="removeFromCart('${item.cakeId}')">✕</button>
    </div>
  `).join('') + `
    <div class="cart-delivery-form" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #f0f0f0;">
      <h4 style="margin-bottom: 10px; font-size: 0.95rem;">Delivery Details</h4>
      <input type="tel" id="checkoutPhone" placeholder="Phone Number (10 digits)" style="width: 100%; margin-bottom: 10px; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-family: inherit;" required>
      <textarea id="checkoutAddress" placeholder="Complete Delivery Address" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; resize: vertical; min-height: 70px; font-family: inherit;" required></textarea>
    </div>
  `;
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

async function placeOrder(e) {
  if (DB.cart.length === 0) { showToast('Cart is empty!', 'error'); return false; }
  
  if (!isLoggedIn()) {
    showToast('Please login to place an order', 'error');
    setTimeout(() => window.location.href = 'login.html', 1500);
    return false;
  }

  const phoneEl = document.getElementById('checkoutPhone');
  const addressEl = document.getElementById('checkoutAddress');
  
  const phone = phoneEl ? phoneEl.value.trim() : '';
  const deliveryAddress = addressEl ? addressEl.value.trim() : '';

  if (!phone || phone.length < 8) {
    showToast('Please provide a valid phone number', 'error');
    if (phoneEl) phoneEl.focus();
    return false;
  }
  
  if (!deliveryAddress) {
    showToast('Please provide a delivery address', 'error');
    if (addressEl) addressEl.focus();
    return false;
  }

  const btn = e ? (e.currentTarget || e.target) : null;
  let originalText = '';
  if (btn) {
    originalText = btn.innerHTML;
    btn.innerHTML = 'Placing Order...';
    btn.disabled = true;
  }

  try {
    const payload = {
      phone: phone,
      deliveryAddress: deliveryAddress,
      items: DB.cart.map(item => ({
        cakeId: item.cakeId,
        qty: item.qty
      }))
    };
    
    const order = await api.post('/orders', payload);
    
    // Clear cart on success
    DB.cart = [];
    saveData();
    
    const badge = document.getElementById('cartBadge');
    if (badge) { badge.textContent = 0; badge.style.display = 'none'; }
    
    const container = document.getElementById('cartItems');
    const totalEl = document.getElementById('cartTotal');
    if (totalEl) totalEl.style.display = 'none';
    
    if (container) {
      const subtotal = order.total - (order.deliveryCharge || 50);
      container.innerHTML = `
        <div style="text-align: center; padding: 20px 10px;">
          <div style="font-size: 3rem; margin-bottom: 10px;">✅</div>
          <h3 style="color: #4CAF50; margin-bottom: 15px;">Order Placed Successfully</h3>
          <p style="margin-bottom: 5px;"><strong>Order ID:</strong> #${order._id}</p>
          <div style="background: #f8f9fa; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: left;">
            <div style="display:flex; justify-content:space-between; margin-bottom: 8px;">
              <span>Subtotal</span><span>₹${subtotal}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom: 8px; color:#666;">
              <span>Delivery Charge</span><span>₹${order.deliveryCharge || 50}</span>
            </div>
            <div style="display:flex; justify-content:space-between; border-top: 1px solid #ddd; padding-top: 10px; font-weight:bold; color:#e91e8c; font-size: 1.1rem;">
              <span>Total</span><span>₹${order.total}</span>
            </div>
          </div>
          <div style="text-align: left; font-size: 0.9rem; margin-bottom: 20px; padding: 15px; border: 1px solid #eee; border-radius: 8px;">
            <p style="margin-bottom:5px"><strong>Phone:</strong> ${order.phone}</p>
            <p style="margin:0"><strong>Delivery Address:</strong><br/>${order.deliveryAddress}</p>
          </div>
          <button class="btn btn-primary" style="width: 100%; padding: 12px; margin-bottom: 10px;" onclick="window.location.href='client-dashboard.html'">View My Orders</button>
          <button class="btn btn-outline" style="width: 100%; padding: 12px; background: none; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;" onclick="toggleCart(); updateCartUI();">Close</button>
        </div>
      `;
    }
    
    return true;
  } catch (error) {
    console.error('Checkout failed', error);
    showToast(error.message || 'Checkout failed', 'error');
    return false;
  } finally {
    if (btn) {
      btn.innerHTML = originalText;
      btn.disabled = false;
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
        <button class="btn btn-outline" onclick="toggleCart()">Cart</button>
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
document.addEventListener('DOMContentLoaded', () => {
  updateNavAuth();
  const hamburger = document.getElementById('hamburger');
  if (hamburger) hamburger.addEventListener('click', toggleMobileNav);
  
  // Start loading cakes for storefront
  loadCakesFromAPI();
});
