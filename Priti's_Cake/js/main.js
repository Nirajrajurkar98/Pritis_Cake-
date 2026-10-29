// ===== DATA STORE =====
const DB = {
  cakes: [],
  users: [],
  cart: JSON.parse(localStorage.getItem('pc_cart') || '[]'),
  currentUser: JSON.parse(localStorage.getItem('pc_current_user') || 'null'),
  settings: {
    deliveryCharge: 50,
    minimumOrderAmount: 0
  }
};

// Admin credentials removed

// ===== SAVE TO STORAGE =====
function saveData() {
  localStorage.setItem('pc_cart', JSON.stringify(DB.cart));
  localStorage.setItem('pc_current_user', JSON.stringify(DB.currentUser));
}

// ===== ESCAPE HTML HELPER =====
function escapeHtml(unsafe) {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ===== DELIVERY CHARGE HELPER =====
function getDeliveryCharge() {
  const subtotal = getCartTotal();
  if (subtotal === 0 || DB.cart.length === 0) return 0;
  if (DB.settings && typeof DB.settings.deliveryCharge === 'number' && DB.settings.deliveryCharge >= 0) {
    return DB.settings.deliveryCharge;
  }
  return 50;
}

// ===== LOAD SETTINGS FROM API =====
let isSettingsLoaded = false;
let isSettingsLoading = false;
let settingsPromise = null;

async function loadSettingsFromAPI() {
  if (isSettingsLoaded) return DB.settings;
  if (isSettingsLoading && settingsPromise) return settingsPromise;

  isSettingsLoading = true;
  settingsPromise = (async () => {
    try {
      let data;
      if (typeof api !== 'undefined' && api.get) {
        data = await api.get('/settings');
      } else {
        const response = await fetch('http://localhost:5000/api/settings');
        if (!response.ok) throw new Error('Failed to load settings');
        data = await response.json();
      }

      if (data && data.success && data.settings) {
        DB.settings = {
          ...DB.settings,
          ...data.settings,
          deliveryCharge: (typeof data.settings.deliveryCharge === 'number' && data.settings.deliveryCharge >= 0)
            ? data.settings.deliveryCharge
            : 50
        };
      }
      isSettingsLoaded = true;
      window.dispatchEvent(new Event('settingsLoaded'));
    } catch (error) {
      console.warn('Could not load shop settings, using default fallback (₹50 delivery charge):', error.message);
      window.dispatchEvent(new Event('settingsError'));
    } finally {
      isSettingsLoading = false;
      updateCartUI();
    }
    return DB.settings;
  })();

  return settingsPromise;
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
  const count = getCartCount();
  const badges = document.querySelectorAll('.cart-badge');
  badges.forEach(badge => {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  });
  renderCartItems();
  if (typeof updateDashCart === 'function') updateDashCart();
}

let isPlacingOrder = false;

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

  const existingPhone = document.getElementById('checkoutPhone')?.value;
  const existingAddress = document.getElementById('checkoutAddress')?.value;
  const existingDate = document.getElementById('checkoutDate')?.value;
  const existingSlot = document.getElementById('checkoutTimeSlot')?.value;
  const existingMessage = document.getElementById('checkoutCakeMessage')?.value;
  const existingInstructions = document.getElementById('checkoutInstructions')?.value;

  const currentPhone = (existingPhone !== undefined && existingPhone !== null)
    ? existingPhone
    : (DB.currentUser?.phone || '');
  const currentAddress = (existingAddress !== undefined && existingAddress !== null)
    ? existingAddress
    : '';
  const currentDate = (existingDate !== undefined && existingDate !== null) ? existingDate : '';
  const currentSlot = (existingSlot !== undefined && existingSlot !== null) ? existingSlot : '';
  const currentMessage = (existingMessage !== undefined && existingMessage !== null) ? existingMessage : '';
  const currentInstructions = (existingInstructions !== undefined && existingInstructions !== null) ? existingInstructions : '';

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

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
      <h4 style="margin-bottom: 10px; font-size: 0.95rem; color:#333;">Delivery Details</h4>
      <div style="display:flex; flex-direction:column; gap:10px;">
        <div>
          <label style="display:block; font-size:0.75rem; color:#666; margin-bottom:3px; font-weight:600;">Phone Number (Required)</label>
          <input type="tel" id="checkoutPhone" placeholder="Phone Number (10 digits)" value="${escapeHtml(currentPhone)}" style="width: 100%; padding: 9px; border: 1px solid #ddd; border-radius: 6px; font-family: inherit; font-size: 0.9rem;" required>
        </div>
        <div>
          <label style="display:block; font-size:0.75rem; color:#666; margin-bottom:3px; font-weight:600;">Delivery Address (Required)</label>
          <textarea id="checkoutAddress" placeholder="Complete Delivery Address" style="width: 100%; padding: 9px; border: 1px solid #ddd; border-radius: 6px; resize: vertical; min-height: 60px; font-family: inherit; font-size: 0.9rem;" required>${escapeHtml(currentAddress)}</textarea>
        </div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
          <div>
            <label style="display:block; font-size:0.75rem; color:#666; margin-bottom:3px; font-weight:600;">Delivery Date</label>
            <input type="date" id="checkoutDate" min="${todayStr}" value="${currentDate}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px; font-family: inherit; font-size: 0.85rem;">
          </div>
          <div>
            <label style="display:block; font-size:0.75rem; color:#666; margin-bottom:3px; font-weight:600;">Time Slot</label>
            <select id="checkoutTimeSlot" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px; font-family: inherit; font-size: 0.85rem;">
              <option value="">Select (Optional)</option>
              <option value="10:00-12:00" ${currentSlot === '10:00-12:00' ? 'selected' : ''}>10:00 - 12:00</option>
              <option value="12:00-14:00" ${currentSlot === '12:00-14:00' ? 'selected' : ''}>12:00 - 14:00</option>
              <option value="16:00-18:00" ${currentSlot === '16:00-18:00' ? 'selected' : ''}>16:00 - 18:00</option>
            </select>
          </div>
        </div>
        <div>
          <label style="display:block; font-size:0.75rem; color:#666; margin-bottom:3px; font-weight:600;">Cake Message (Optional, max 100)</label>
          <input type="text" id="checkoutCakeMessage" maxlength="100" placeholder="e.g. Happy Birthday!" value="${escapeHtml(currentMessage)}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px; font-family: inherit; font-size: 0.85rem;">
        </div>
        <div>
          <label style="display:block; font-size:0.75rem; color:#666; margin-bottom:3px; font-weight:600;">Special Instructions (Optional, max 500)</label>
          <textarea id="checkoutInstructions" maxlength="500" placeholder="e.g. Please ring bell twice" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px; resize: vertical; min-height: 50px; font-family: inherit; font-size: 0.85rem;">${escapeHtml(currentInstructions)}</textarea>
        </div>
      </div>
    </div>
  `;
  const subtotal = getCartTotal();
  const delivery = getDeliveryCharge();
  const subtotalEl = document.getElementById('cartSubtotal');
  const deliveryEl = document.getElementById('cartDelivery');
  const grandTotalEl = document.getElementById('cartGrandTotal');
  if (subtotalEl) subtotalEl.textContent = `₹${subtotal}`;
  if (deliveryEl) deliveryEl.textContent = `₹${delivery}`;
  if (grandTotalEl) grandTotalEl.textContent = `₹${subtotal + delivery}`;

  // Minimum order notice
  let minNoticeEl = document.getElementById('cartMinOrderNotice');
  const minOrder = (DB.settings && typeof DB.settings.minimumOrderAmount === 'number') ? DB.settings.minimumOrderAmount : 0;
  if (minOrder > 0) {
    if (!minNoticeEl && totalEl) {
      minNoticeEl = document.createElement('div');
      minNoticeEl.id = 'cartMinOrderNotice';
      minNoticeEl.style.cssText = 'padding:8px 12px;border-radius:6px;font-size:0.85rem;margin-top:10px;text-align:center;font-weight:500;';
      const checkoutBtn = totalEl.querySelector('button.btn-primary');
      if (checkoutBtn) totalEl.insertBefore(minNoticeEl, checkoutBtn);
    }
    if (minNoticeEl) {
      if (subtotal < minOrder) {
        minNoticeEl.style.background = '#fff3cd';
        minNoticeEl.style.color = '#856404';
        minNoticeEl.style.border = '1px solid #ffeeba';
        minNoticeEl.innerHTML = `⚠️ Minimum order is <strong>₹${minOrder}</strong>. Add ₹${minOrder - subtotal} more.`;
      } else {
        minNoticeEl.style.background = '#e8f5e9';
        minNoticeEl.style.color = '#2e7d32';
        minNoticeEl.style.border = '1px solid #c8e6c9';
        minNoticeEl.innerHTML = `✓ Minimum order of ₹${minOrder} met`;
      }
    }
  } else if (minNoticeEl) {
    minNoticeEl.remove();
  }
}

function toggleCart() {
  const sidebar = document.getElementById('cartSidebar');
  if (sidebar) sidebar.classList.toggle('open');
}

async function placeOrder(e) {
  if (isPlacingOrder) return false;

  if (DB.cart.length === 0) {
    showToast('Cart is empty! Add some cakes first 🎂', 'error');
    return false;
  }

  if (!isLoggedIn()) {
    showToast('Please login to place an order', 'error');
    setTimeout(() => window.location.href = 'login.html', 1500);
    return false;
  }

  const subtotal = getCartTotal();
  const minOrder = (DB.settings && typeof DB.settings.minimumOrderAmount === 'number') ? DB.settings.minimumOrderAmount : 0;
  if (minOrder > 0 && subtotal < minOrder) {
    showToast(`Minimum order amount is ₹${minOrder}. Please add ₹${minOrder - subtotal} more to your cart.`, 'error');
    return false;
  }

  const phoneEl = document.getElementById('dashPhone') || document.getElementById('checkoutPhone');
  const addressEl = document.getElementById('dashAddress') || document.getElementById('checkoutAddress');
  const dateEl = document.getElementById('dashDate') || document.getElementById('checkoutDate');
  const slotEl = document.getElementById('dashTimeSlot') || document.getElementById('checkoutTimeSlot');
  const msgEl = document.getElementById('dashCakeMessage') || document.getElementById('checkoutCakeMessage');
  const instEl = document.getElementById('dashInstructions') || document.getElementById('checkoutInstructions');

  const phone = phoneEl ? phoneEl.value.trim() : (DB.currentUser?.phone || '').trim();
  const deliveryAddress = addressEl ? addressEl.value.trim() : '';
  const deliveryDate = dateEl ? dateEl.value.trim() : '';
  const deliveryTimeSlot = slotEl ? slotEl.value.trim() : '';
  const cakeMessage = msgEl ? msgEl.value.trim() : '';
  const specialInstructions = instEl ? instEl.value.trim() : '';

  if (!phone || phone.length < 8 || phone.length > 15 || !/^[0-9+\-\s()]+$/.test(phone)) {
    showToast('Please provide a valid phone number', 'error');
    if (phoneEl) phoneEl.focus();
    return false;
  }

  if (!deliveryAddress) {
    showToast('Please provide a delivery address', 'error');
    if (addressEl) addressEl.focus();
    return false;
  }

  if (deliveryAddress.length > 500) {
    showToast('Delivery address is too long', 'error');
    if (addressEl) addressEl.focus();
    return false;
  }

  if (deliveryDate) {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (deliveryDate < todayStr) {
      showToast('Delivery date cannot be earlier than today', 'error');
      if (dateEl) dateEl.focus();
      return false;
    }
  }

  if (cakeMessage && cakeMessage.length > 100) {
    showToast('Cake message cannot exceed 100 characters', 'error');
    if (msgEl) msgEl.focus();
    return false;
  }

  if (specialInstructions && specialInstructions.length > 500) {
    showToast('Special instructions cannot exceed 500 characters', 'error');
    if (instEl) instEl.focus();
    return false;
  }

  isPlacingOrder = true;
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
    if (deliveryDate) payload.deliveryDate = deliveryDate;
    if (deliveryTimeSlot) payload.deliveryTimeSlot = deliveryTimeSlot;
    if (cakeMessage) payload.cakeMessage = cakeMessage;
    if (specialInstructions) payload.specialInstructions = specialInstructions;

    const order = await api.post('/orders', payload);

    // Clear cart on success
    DB.cart = [];
    saveData();

    const badges = document.querySelectorAll('.cart-badge');
    badges.forEach(badge => { badge.textContent = 0; badge.style.display = 'none'; });

    const container = document.getElementById('cartItems');
    const totalEl = document.getElementById('cartTotal');
    if (totalEl) totalEl.style.display = 'none';

    if (container) {
      const deliveryFee = order.deliveryCharge !== undefined ? order.deliveryCharge : getDeliveryCharge();
      const orderSubtotal = order.total - deliveryFee;
      container.innerHTML = `
        <div style="text-align: center; padding: 20px 10px;">
          <div style="font-size: 3rem; margin-bottom: 10px;">✅</div>
          <h3 style="color: #4CAF50; margin-bottom: 15px;">Order Placed Successfully</h3>
          <p style="margin-bottom: 5px;"><strong>Order ID:</strong> #${order._id}</p>
          <div style="background: #f8f9fa; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: left;">
            <div style="display:flex; justify-content:space-between; margin-bottom: 8px;">
              <span>Subtotal</span><span>₹${orderSubtotal}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom: 8px; color:#666;">
              <span>Delivery Charge</span><span>₹${deliveryFee}</span>
            </div>
            <div style="display:flex; justify-content:space-between; border-top: 1px solid #ddd; padding-top: 10px; font-weight:bold; color:#e91e8c; font-size: 1.1rem;">
              <span>Total</span><span>₹${order.total}</span>
            </div>
          </div>
          <div style="text-align: left; font-size: 0.9rem; margin-bottom: 20px; padding: 15px; border: 1px solid #eee; border-radius: 8px;">
            <p style="margin-bottom:5px"><strong>Phone:</strong> ${escapeHtml(order.phone)}</p>
            <p style="margin-bottom:5px"><strong>Delivery Address:</strong><br/>${escapeHtml(order.deliveryAddress)}</p>
            ${order.deliveryDate ? `<p style="margin-bottom:5px"><strong>Delivery Date:</strong> ${escapeHtml(order.deliveryDate)}</p>` : ''}
            ${order.deliveryTimeSlot ? `<p style="margin-bottom:5px"><strong>Time Slot:</strong> ${escapeHtml(order.deliveryTimeSlot)}</p>` : ''}
            ${order.cakeMessage ? `<p style="margin-bottom:5px"><strong>Cake Message:</strong> "${escapeHtml(order.cakeMessage)}"</p>` : ''}
            ${order.specialInstructions ? `<p style="margin:0"><strong>Instructions:</strong><br/>${escapeHtml(order.specialInstructions)}</p>` : ''}
          </div>
          <button class="btn btn-primary" style="width: 100%; padding: 12px; margin-bottom: 10px;" onclick="window.location.href='client-dashboard.html'">View My Orders</button>
          <button class="btn btn-outline" style="width: 100%; padding: 12px; background: none; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;" onclick="toggleCart(); updateCartUI();">Close</button>
        </div>
      `;
    }
    if (typeof updateDashCart === 'function') updateDashCart();
    showToast('Order placed successfully! 🎂', 'success');
    return order;
  } catch (error) {
    console.error('Checkout failed', error);
    showToast(error.message || 'Checkout failed', 'error');
    return false;
  } finally {
    isPlacingOrder = false;
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
  const mobileNavBtns = document.getElementById('mobileNavBtns');
  if (!navBtns && !mobileNavBtns) return;

  const cartHTMLDesktop = `
    <div class="cart-btn-wrap">
      <button class="btn btn-outline cart-btn" onclick="toggleCart()" aria-label="Shopping Cart">
        <span class="cart-btn-icon" aria-hidden="true">🛒</span> Cart
        <span class="cart-badge" id="cartBadge" style="display:none">0</span>
      </button>
    </div>
  `;

  const cartHTMLMobile = `
    <div class="cart-btn-wrap">
      <button class="btn btn-outline cart-btn" onclick="toggleCart(); closeMobileNav();" aria-label="Shopping Cart">
        <span class="cart-btn-icon" aria-hidden="true">🛒</span> Cart
        <span class="cart-badge" style="display:none">0</span>
      </button>
    </div>
  `;

  const authHTML = isLoggedIn()
    ? `<a href="${isAdmin() ? 'admin-dashboard.html' : 'client-dashboard.html'}" class="btn btn-primary">Dashboard</a>`
    : `<a href="login.html" class="btn btn-outline">Login</a>`;

  if (navBtns) navBtns.innerHTML = cartHTMLDesktop + authHTML;
  if (mobileNavBtns) mobileNavBtns.innerHTML = cartHTMLMobile + authHTML;

  updateCartUI();
}

// ===== MOBILE NAVIGATION =====
function openMobileNav() {
  const drawer = document.getElementById('navDrawer');
  const hamburger = document.getElementById('hamburger');
  const backdrop = document.getElementById('navBackdrop');
  if (drawer) drawer.classList.add('open');
  if (hamburger) {
    hamburger.classList.add('active');
    hamburger.setAttribute('aria-expanded', 'true');
  }
  if (backdrop) backdrop.classList.add('active');
  document.body.classList.add('nav-open');
}

function closeMobileNav() {
  const drawer = document.getElementById('navDrawer');
  const hamburger = document.getElementById('hamburger');
  const backdrop = document.getElementById('navBackdrop');
  if (drawer) drawer.classList.remove('open');
  if (hamburger) {
    hamburger.classList.remove('active');
    hamburger.setAttribute('aria-expanded', 'false');
  }
  if (backdrop) backdrop.classList.remove('active');
  document.body.classList.remove('nav-open');
}

function toggleMobileNav() {
  const drawer = document.getElementById('navDrawer');
  if (drawer && drawer.classList.contains('open')) {
    closeMobileNav();
  } else {
    openMobileNav();
  }
}

// ===== ACTIVE NAVIGATION LINK HIGHLIGHTING =====
function setActiveNavLink() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const links = document.querySelectorAll('.nav-links a');
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    const linkPath = href.split('?')[0].split('#')[0];
    if (linkPath === currentPath || (currentPath === '' && linkPath === 'index.html')) {
      link.setAttribute('aria-current', 'page');
      link.classList.add('active');
    } else {
      link.removeAttribute('aria-current');
      link.classList.remove('active');
    }
  });
}

function initNavigationEvents() {
  const hamburger = document.getElementById('hamburger');
  if (hamburger) {
    hamburger.addEventListener('click', toggleMobileNav);
  }

  const backdrop = document.getElementById('navBackdrop');
  if (backdrop) {
    backdrop.addEventListener('click', closeMobileNav);
  }

  // Close mobile nav on navigation link click
  const drawer = document.getElementById('navDrawer');
  if (drawer) {
    const links = drawer.querySelectorAll('a');
    links.forEach(link => {
      link.addEventListener('click', closeMobileNav);
    });
  }

  // Close on Escape key press
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const currentDrawer = document.getElementById('navDrawer');
      if (currentDrawer && currentDrawer.classList.contains('open')) {
        closeMobileNav();
        const currentHamburger = document.getElementById('hamburger');
        if (currentHamburger) currentHamburger.focus();
      }
    }
  });

  // Close if viewport is resized to desktop width
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
      closeMobileNav();
    }
  });

  // Set active link on load
  setActiveNavLink();
}

// ===== INIT =====
function initStorefrontApp() {
  updateNavAuth();
  initNavigationEvents();

  // Start loading settings and cakes for storefront
  loadSettingsFromAPI();
  loadCakesFromAPI();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initStorefrontApp);
} else {
  initStorefrontApp();
}
