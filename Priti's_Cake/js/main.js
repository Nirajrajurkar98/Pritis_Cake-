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

// ===== CART & CHECKOUT SYSTEM =====
function addToCart(cakeId, qty = 1) {
  const cake = DB.cakes.find(c => String(c.id) === String(cakeId));
  if (!cake) return;
  const existing = DB.cart.find(i => String(i.cakeId) === String(cakeId));
  if (existing) {
    showToast('This cake is already in your cart!', 'info');
    return;
  }
  const cleanQty = Math.max(1, parseInt(qty, 10) || 1);
  DB.cart.push({
    cakeId: cake.id,
    qty: cleanQty,
    name: cake.name,
    price: cake.price,
    emoji: cake.emoji,
    image: cake.image || ''
  });
  saveData();
  updateCartUI();
  showToast('Cake added to your cart successfully!', 'success');
}

function removeFromCart(cakeId) {
  const item = DB.cart.find(i => String(i.cakeId) === String(cakeId));
  const itemName = item ? item.name : 'Cake';
  DB.cart = DB.cart.filter(i => String(i.cakeId) !== String(cakeId));
  saveData();
  updateCartUI();
  showToast(`${itemName} removed from your cart.`, 'info');
}

function updateCartItemQty(cakeId, delta) {
  const item = DB.cart.find(i => String(i.cakeId) === String(cakeId));
  if (!item) return;
  const newQty = item.qty + delta;
  if (newQty >= 1) {
    item.qty = newQty;
    saveData();
    updateCartUI();
  } else if (newQty === 0) {
    removeFromCart(cakeId);
  }
}

function getCartTotal() {
  return DB.cart.reduce((sum, i) => sum + (Number(i.price) * Number(i.qty)), 0);
}

function getCartCount() {
  return DB.cart.reduce((sum, i) => sum + Number(i.qty), 0);
}

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

function getCartItemMedia(item) {
  if (item && item.image) {
    const src = item.image.startsWith('http') || item.image.startsWith('data:')
      ? item.image
      : `http://localhost:5000${item.image}`;
    return `<img src="${src}" alt="${escapeHtml(item.name)}" loading="lazy">`;
  }
  return `
    <div class="cart-cloche-placeholder" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2a9 9 0 0 1 9 9v1H3v-1a9 9 0 0 1 9-9z"/>
        <path d="M3 12h18v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7z"/>
        <circle cx="12" cy="7" r="1.5"/>
      </svg>
    </div>
  `;
}

let isPlacingOrder = false;

function renderCartItems() {
  const container = document.getElementById('cartItems');
  const totalEl = document.getElementById('cartTotal');
  if (!container) return;

  if (DB.cart.length === 0) {
    container.innerHTML = `
      <div class="cart-empty-state">
        <div class="cart-empty-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2a9 9 0 0 1 9 9v1H3v-1a9 9 0 0 1 9-9z"/>
            <path d="M3 12h18v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7z"/>
            <circle cx="12" cy="7" r="1.5"/>
          </svg>
        </div>
        <h3 class="cart-empty-title">Your Cart is Empty</h3>
        <p class="cart-empty-text">Your artisanal selection is empty. Discover freshly baked celebration cakes handcrafted to order in Rahuri.</p>
        <button type="button" class="btn btn-primary cart-empty-btn" onclick="toggleCart(); window.location.href='catalog.html';">
          Browse Cakes
        </button>
      </div>
    `;
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

  const itemsHtml = DB.cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-img">${getCartItemMedia(item)}</div>
      <div class="cart-item-info">
        <div class="cart-item-top">
          <h4 class="cart-item-title">${escapeHtml(item.name)}</h4>
          <button type="button" class="cart-item-remove-btn" onclick="removeFromCart('${item.cakeId}')" title="Remove ${escapeHtml(item.name)}" aria-label="Remove ${escapeHtml(item.name)} from cart">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
        <div class="cart-item-price-unit">₹${Number(item.price).toLocaleString('en-IN')} each</div>
        <div class="cart-item-bottom">
          <div class="cart-qty-stepper">
            <button type="button" class="cart-qty-btn" onclick="updateCartItemQty('${item.cakeId}', -1)" aria-label="Decrease quantity for ${escapeHtml(item.name)}">−</button>
            <span class="cart-qty-val" aria-live="polite">${item.qty}</span>
            <button type="button" class="cart-qty-btn" onclick="updateCartItemQty('${item.cakeId}', 1)" aria-label="Increase quantity for ${escapeHtml(item.name)}">+</button>
          </div>
          <div class="cart-item-line-total">₹${Number(item.price * item.qty).toLocaleString('en-IN')}</div>
        </div>
      </div>
    </div>
  `).join('');

  const authNoticeHtml = isLoggedIn()
    ? `
      <div class="checkout-auth-badge">
        <div class="checkout-auth-avatar" aria-hidden="true">${escapeHtml((DB.currentUser?.name || 'C').charAt(0).toUpperCase())}</div>
        <div class="checkout-auth-details">
          <span class="checkout-auth-label">Ordering as</span>
          <strong class="checkout-auth-name">${escapeHtml(DB.currentUser?.name || 'Customer')}</strong>
        </div>
      </div>
    `
    : `
      <div class="checkout-guest-notice">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        <div>
          <strong>Customer account recommended</strong>
          <p>Please <a href="login.html" onclick="toggleCart()">Sign In</a> or <a href="login.html?tab=register" onclick="toggleCart()">Register</a> to place and track your order.</p>
        </div>
      </div>
    `;

  const deliveryFormHtml = `
    <div class="cart-delivery-section">
      <div class="cart-section-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="1" y="3" width="15" height="13"/>
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
          <circle cx="5.5" cy="18.5" r="2.5"/>
          <circle cx="18.5" cy="18.5" r="2.5"/>
        </svg>
        <span>Delivery &amp; Celebration Details</span>
      </div>

      ${authNoticeHtml}

      <div class="cart-form-fields">
        <div class="cart-field-group">
          <label for="checkoutPhone" class="cart-field-label">Recipient Phone Number <span class="required" aria-hidden="true">*</span></label>
          <input type="tel" id="checkoutPhone" autocomplete="tel" placeholder="10-digit mobile number" value="${escapeHtml(currentPhone)}" class="cart-field-input" required aria-describedby="checkoutPhoneHint">
          <span id="checkoutPhoneHint" class="cart-field-hint">Required for delivery coordination across Rahuri</span>
        </div>

        <div class="cart-field-group">
          <label for="checkoutAddress" class="cart-field-label">Delivery Destination Address <span class="required" aria-hidden="true">*</span></label>
          <textarea id="checkoutAddress" autocomplete="street-address" placeholder="House/Flat number, street, landmark, Rahuri destination" class="cart-field-textarea" required aria-describedby="checkoutAddressHint">${escapeHtml(currentAddress)}</textarea>
          <span id="checkoutAddressHint" class="cart-field-hint">Include landmark for accurate dispatch</span>
        </div>

        <div class="cart-field-row">
          <div class="cart-field-group">
            <label for="checkoutDate" class="cart-field-label">Delivery Date</label>
            <input type="date" id="checkoutDate" min="${todayStr}" value="${currentDate}" class="cart-field-input">
          </div>
          <div class="cart-field-group">
            <label for="checkoutTimeSlot" class="cart-field-label">Time Window</label>
            <select id="checkoutTimeSlot" class="cart-field-select">
              <option value="">Select (Optional)</option>
              <option value="10:00-12:00" ${currentSlot === '10:00-12:00' ? 'selected' : ''}>10:00 AM - 12:00 PM</option>
              <option value="12:00-14:00" ${currentSlot === '12:00-14:00' ? 'selected' : ''}>12:00 PM - 02:00 PM</option>
              <option value="16:00-18:00" ${currentSlot === '16:00-18:00' ? 'selected' : ''}>04:00 PM - 06:00 PM</option>
            </select>
          </div>
        </div>

        <div class="cart-field-group">
          <label for="checkoutCakeMessage" class="cart-field-label">Cake Inscription Message</label>
          <input type="text" id="checkoutCakeMessage" maxlength="100" placeholder="e.g. Happy 25th Anniversary!" value="${escapeHtml(currentMessage)}" class="cart-field-input" aria-describedby="checkoutMessageHint">
          <span id="checkoutMessageHint" class="cart-field-hint">Optional personalized piping on cake (max 100 chars)</span>
        </div>

        <div class="cart-field-group">
          <label for="checkoutInstructions" class="cart-field-label">Special Delivery Instructions</label>
          <textarea id="checkoutInstructions" maxlength="500" placeholder="e.g. Handle with delicate care, ring bell twice" class="cart-field-textarea" style="min-height:54px;" aria-describedby="checkoutInstHint">${escapeHtml(currentInstructions)}</textarea>
          <span id="checkoutInstHint" class="cart-field-hint">Optional dietary or delivery coordination notes (max 500 chars)</span>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = `<div class="cart-items-list">${itemsHtml}</div>` + deliveryFormHtml;

  const subtotal = getCartTotal();
  const delivery = getDeliveryCharge();
  const grandTotal = subtotal + delivery;

  const subtotalEl = document.getElementById('cartSubtotal');
  const deliveryEl = document.getElementById('cartDelivery');
  const grandTotalEl = document.getElementById('cartGrandTotal');
  if (subtotalEl) subtotalEl.textContent = `₹${subtotal.toLocaleString('en-IN')}`;
  if (deliveryEl) deliveryEl.textContent = `₹${delivery.toLocaleString('en-IN')}`;
  if (grandTotalEl) grandTotalEl.textContent = `₹${grandTotal.toLocaleString('en-IN')}`;

  // Minimum order notice
  let minNoticeEl = document.getElementById('cartMinOrderNotice');
  const minOrder = (DB.settings && typeof DB.settings.minimumOrderAmount === 'number') ? DB.settings.minimumOrderAmount : 0;
  if (minOrder > 0) {
    if (!minNoticeEl && totalEl) {
      minNoticeEl = document.createElement('div');
      minNoticeEl.id = 'cartMinOrderNotice';
      minNoticeEl.className = 'cart-min-order-notice';
      const checkoutBtn = totalEl.querySelector('button.btn-primary');
      if (checkoutBtn) totalEl.insertBefore(minNoticeEl, checkoutBtn);
    }
    if (minNoticeEl) {
      if (subtotal < minOrder) {
        minNoticeEl.className = 'cart-min-order-notice warning';
        minNoticeEl.innerHTML = `Minimum celebration order is <strong>₹${minOrder.toLocaleString('en-IN')}</strong>. Please add ₹${(minOrder - subtotal).toLocaleString('en-IN')} more.`;
      } else {
        minNoticeEl.className = 'cart-min-order-notice success';
        minNoticeEl.innerHTML = `Minimum order requirement of ₹${minOrder.toLocaleString('en-IN')} is met.`;
      }
    }
  } else if (minNoticeEl) {
    minNoticeEl.remove();
  }

  // Update checkout button dynamic text
  const checkoutBtn = totalEl ? totalEl.querySelector('button.btn-primary') : null;
  if (checkoutBtn && !isPlacingOrder) {
    checkoutBtn.className = 'btn btn-primary cart-checkout-btn';
    checkoutBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;margin-right:4px;" aria-hidden="true">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
      Place Order • ₹${grandTotal.toLocaleString('en-IN')}
    `;
  }
}

function toggleCart() {
  const sidebar = document.getElementById('cartSidebar');
  if (!sidebar) return;

  let backdrop = document.getElementById('cartBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'cartBackdrop';
    backdrop.className = 'cart-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.onclick = toggleCart;
    document.body.appendChild(backdrop);
  }

  const willOpen = !sidebar.classList.contains('open');
  sidebar.classList.toggle('open', willOpen);
  backdrop.classList.toggle('active', willOpen);
  document.body.classList.toggle('cart-open', willOpen);

  if (willOpen) {
    updateCartUI();
  }
}

function closeCart() {
  const sidebar = document.getElementById('cartSidebar');
  const backdrop = document.getElementById('cartBackdrop');
  if (sidebar && sidebar.classList.contains('open')) {
    sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('active');
    document.body.classList.remove('cart-open');
  }
}

// Global escape key to dismiss cart drawer
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeCart();
  }
});

async function placeOrder(e) {
  if (isPlacingOrder) return false;

  if (DB.cart.length === 0) {
    showToast('Your cart is empty. Add celebration cakes first.', 'error');
    return false;
  }

  if (!isLoggedIn()) {
    showToast('Please sign in to place and track your order', 'error');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1200);
    return false;
  }

  const subtotal = getCartTotal();
  const minOrder = (DB.settings && typeof DB.settings.minimumOrderAmount === 'number') ? DB.settings.minimumOrderAmount : 0;
  if (minOrder > 0 && subtotal < minOrder) {
    showToast(`Minimum order amount is ₹${minOrder.toLocaleString('en-IN')}. Please add ₹${(minOrder - subtotal).toLocaleString('en-IN')} more to your cart.`, 'error');
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
    showToast('Please provide a valid 10-digit phone number', 'error');
    if (phoneEl) phoneEl.focus();
    return false;
  }

  if (!deliveryAddress) {
    showToast('Please provide a complete delivery address', 'error');
    if (addressEl) addressEl.focus();
    return false;
  }

  if (deliveryAddress.length > 500) {
    showToast('Delivery address cannot exceed 500 characters', 'error');
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
  let originalHtml = '';
  if (btn) {
    originalHtml = btn.innerHTML;
    btn.innerHTML = `
      <svg class="spin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;margin-right:6px;animation:spin 1s linear infinite;" aria-hidden="true">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
        <path d="M12 2a10 10 0 0 1 10 10"/>
      </svg>
      Placing Your Order...
    `;
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
    badges.forEach(badge => {
      badge.textContent = 0;
      badge.style.display = 'none';
    });

    const container = document.getElementById('cartItems');
    const totalEl = document.getElementById('cartTotal');
    if (totalEl) totalEl.style.display = 'none';

    if (container) {
      const deliveryFee = order.deliveryCharge !== undefined ? order.deliveryCharge : getDeliveryCharge();
      const orderSubtotal = order.total - deliveryFee;
      const orderRef = order._id ? `#${order._id.substring(order._id.length - 6).toUpperCase()}` : '#ORDER';

      container.innerHTML = `
        <div class="cart-success-view">
          <div class="cart-success-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h3 class="cart-success-title">Order Confirmed!</h3>
          <p class="cart-success-sub">Thank you for choosing Priti's Cake. Your artisanal confectionery order has been received and scheduled.</p>

          <div class="cart-receipt-card">
            <div class="receipt-header">
              <span class="receipt-ref-label">Order Reference</span>
              <span class="receipt-ref-num">${orderRef}</span>
            </div>

            <div class="receipt-breakdown">
              <div class="receipt-row">
                <span>Items Subtotal</span>
                <span>₹${Number(orderSubtotal).toLocaleString('en-IN')}</span>
              </div>
              <div class="receipt-row">
                <span>Delivery Fee</span>
                <span>₹${Number(deliveryFee).toLocaleString('en-IN')}</span>
              </div>
              <div class="receipt-row total">
                <span>Grand Total</span>
                <span>₹${Number(order.total).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div class="receipt-details">
              <p><strong>Contact:</strong> ${escapeHtml(order.phone)}</p>
              <p><strong>Destination:</strong> ${escapeHtml(order.deliveryAddress)}</p>
              ${order.deliveryDate ? `<p><strong>Scheduled Date:</strong> ${escapeHtml(order.deliveryDate)}</p>` : ''}
              ${order.deliveryTimeSlot ? `<p><strong>Time Window:</strong> ${escapeHtml(order.deliveryTimeSlot)}</p>` : ''}
              ${order.cakeMessage ? `<p><strong>Cake Inscription:</strong> "${escapeHtml(order.cakeMessage)}"</p>` : ''}
              ${order.specialInstructions ? `<p><strong>Instructions:</strong> ${escapeHtml(order.specialInstructions)}</p>` : ''}
            </div>
          </div>

          <div class="cart-success-actions">
            <a href="client-dashboard.html" class="btn btn-primary" style="width:100%;margin-bottom:10px;">
              View in Customer Dashboard
            </a>
            <button type="button" class="btn btn-outline" style="width:100%;" onclick="toggleCart(); updateCartUI();">
              Continue Browsing
            </button>
          </div>
        </div>
      `;
    }

    if (typeof updateDashCart === 'function') updateDashCart();
    showToast('Your order has been placed successfully!', 'success');
    return order;
  } catch (error) {
    console.error('Checkout failed', error);
    showToast(error.message || 'Checkout failed. Please try again.', 'error');
    return false;
  } finally {
    isPlacingOrder = false;
    if (btn) {
      btn.innerHTML = originalHtml;
      btn.disabled = false;
    }
  }
}

// ===== TOAST =====
let toastTimer = null;
function showToast(msg, type = '') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  if (toastTimer) clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.className = `toast ${type}`.trim();
  setTimeout(() => toast.classList.add('show'), 10);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
    toastTimer = null;
  }, 3000);
}

// ===== NAV AUTH BUTTONS =====
function updateNavAuth() {
  const navBtns = document.getElementById('navBtns');
  const mobileNavBtns = document.getElementById('mobileNavBtns');
  if (!navBtns && !mobileNavBtns) return;

  const cartSvg = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:16px;height:16px;display:inline-block;vertical-align:-2px;margin-right:4px;">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  `;

  const cartHTMLDesktop = `
    <div class="cart-btn-wrap">
      <button class="btn btn-outline cart-btn" onclick="toggleCart()" aria-label="Shopping Cart">
        ${cartSvg}<span>Cart</span>
        <span class="cart-badge" id="cartBadge" style="display:none">0</span>
      </button>
    </div>
  `;

  const cartHTMLMobile = `
    <div class="cart-btn-wrap">
      <button class="btn btn-outline cart-btn" onclick="toggleCart(); closeMobileNav();" aria-label="Shopping Cart">
        ${cartSvg}<span>Cart</span>
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
