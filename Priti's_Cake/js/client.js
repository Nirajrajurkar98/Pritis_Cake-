document.addEventListener('DOMContentLoaded', () => {
  if (!isLoggedIn() || isAdmin()) { window.location.href = 'login.html'; return; }

  // Set fallback from cache for instant load
  if (DB.currentUser && DB.currentUser.name) {
    document.getElementById('clientName').textContent = DB.currentUser.name;
    document.getElementById('clientInitial').textContent = DB.currentUser.name[0];
  }

  // Fetch authoritative profile from backend immediately
  loadProfile();

  if (isCakesLoaded || cakesError) {
    initDashboard();
  } else {
    window.addEventListener('cakesLoaded', initDashboard);
    window.addEventListener('cakesError', initDashboard);
  }
});

function initDashboard() {
  loadClientDashboard();
  showClientSection('overview');
}

function showClientSection(id) {
  document.querySelectorAll('.dash-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  const sec = document.getElementById('csec-' + id);
  const link = document.getElementById('clink-' + id);
  if (sec) sec.classList.add('active');
  if (link) link.classList.add('active');
  document.getElementById('pageTitle').textContent = {
    overview: 'My Dashboard', browse: 'Browse Cakes',
    orders: 'My Orders', profile: 'My Profile'
  }[id] || 'Dashboard';

  if (id === 'browse') loadBrowseCakes();
  if (id === 'orders') loadClientOrders();
  if (id === 'overview') loadClientDashboard();
  if (id === 'profile') loadProfile();
}

async function loadClientDashboard() {
  let myOrders = [];
  try {
    myOrders = await api.get('/orders/myorders');
    window.customerOrders = myOrders;
  } catch (err) {
    console.error('Failed to load dashboard orders:', err);
  }

  const spent = myOrders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + o.total, 0);
  const pending = myOrders.filter(o => ['Pending', 'Confirmed', 'Preparing', 'Out for Delivery'].includes(o.status)).length;

  document.getElementById('myOrderCount').textContent = myOrders.length;
  document.getElementById('mySpent').textContent = '₹' + spent.toLocaleString();
  document.getElementById('myPending').textContent = pending;

  // Recent orders
  const tbody = document.getElementById('clientRecentOrders');
  const recent = [...myOrders].slice(0, 5); // Assuming already sorted descending by backend
  tbody.innerHTML = recent.length ? recent.map(o => `
    <tr>
      <td><strong>#${o._id.substring(o._id.length-6).toUpperCase()}</strong></td>
      <td>${o.items.map(i => i.name).join(', ')}</td>
      <td><strong>₹${o.total.toLocaleString()}</strong></td>
      <td><span class="badge badge-${o.status.toLowerCase().replace(/\s+/g, '-')}">${o.status}</span></td>
      <td>${new Date(o.createdAt || o.date).toLocaleDateString()}</td>
      <td style="text-align:right">
        <button class="btn btn-outline" style="padding:4px 8px;font-size:0.75rem" onclick="viewOrderDetails('${o._id}')">View</button>
      </td>
    </tr>
  `).join('') : '<tr><td colspan="6" style="text-align:center;color:#999;padding:30px">No orders yet. <a href="#" onclick="showClientSection(\'browse\')" style="color:#e91e8c">Browse cakes!</a></td></tr>';

  // Featured cakes
  const featGrid = document.getElementById('featuredCakesGrid');
  if (featGrid) {
    featGrid.innerHTML = DB.cakes.slice(0, 4).map(cake => `
      <div class="client-cake-card" onclick="openCakeDetail('${cake.id}')">
        <div class="client-cake-img">${cakeMedia(cake)}</div>
        <div class="client-cake-info">
          <h4>${cake.name}</h4>
          <div class="price">₹${cake.price}</div>
        </div>
      </div>
    `).join('');
  }
}

function loadBrowseCakes(filter = 'All') {
  const grid = document.getElementById('browseCakesGrid');
  
  if (cakesError) {
    grid.innerHTML = '<div style="text-align:center;padding:40px;color:#e91e8c;grid-column:1/-1">Unable to load cakes. Please try again.</div>';
    return;
  }
  
  if (DB.cakes.length === 0) {
    grid.innerHTML = '<div style="text-align:center;padding:40px;color:#999;grid-column:1/-1">No cakes are available at the moment.</div>';
    return;
  }

  const cakes = filter === 'All' ? DB.cakes : DB.cakes.filter(c => c.category === filter);
  
  if (cakes.length === 0) {
    grid.innerHTML = '<div style="text-align:center;padding:40px;color:#999;grid-column:1/-1">No cakes found for this category.</div>';
  } else {
    grid.innerHTML = cakes.map(cake => `
      <div class="client-cake-card" onclick="openCakeDetail('${cake.id}')">
          <div class="client-cake-img">${cakeMedia(cake)}</div>
          <div class="client-cake-info">
            <h4>${cake.name}</h4>
            <div style="font-size:0.75rem;color:#999;margin-bottom:5px">${cake.category}</div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div class="price">₹${cake.price}</div>
            <div style="font-size:0.75rem;color:#ffa500">⭐ ${cake.rating || 0}</div>
          </div>
          <button class="btn btn-primary" style="width:100%;margin-top:10px;padding:8px;font-size:0.85rem" onclick="event.stopPropagation();addToCartClient('${cake.id}')">Add to Cart 🛒</button>
        </div>
      </div>
    `).join('');
  }

  // Update filter buttons
  document.querySelectorAll('.cat-filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cat === filter);
  });
}

function addToCartClient(cakeId) {
  addToCart(cakeId, 1);
}

function openCakeDetail(id) {
  const cake = DB.cakes.find(c => c.id === id);
  if (!cake) return;
  document.getElementById('detailContent').innerHTML = `
    <div style="height:180px;background:linear-gradient(135deg,#ffb3d9,#ff6ec7);border-radius:15px;display:flex;align-items:center;justify-content:center;font-size:6rem;margin-bottom:20px;overflow:hidden">${cakeMedia(cake)}</div>
    <h2>${cake.name}</h2>
    <div style="font-size:1.8rem;font-weight:800;color:#e91e8c;margin:10px 0">₹${cake.price}</div>
    <p style="color:#666;line-height:1.7;margin-bottom:20px">${cake.desc || ''}</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
      <div style="background:#fff0f8;padding:12px;border-radius:10px"><span style="font-size:0.75rem;color:#999">Weight</span><p style="font-weight:600">${cake.weight || '-'}</p></div>
      <div style="background:#fff0f8;padding:12px;border-radius:10px"><span style="font-size:0.75rem;color:#999">Serves</span><p style="font-weight:600">${cake.serves || '-'}</p></div>
      <div style="background:#fff0f8;padding:12px;border-radius:10px"><span style="font-size:0.75rem;color:#999">Prep Time</span><p style="font-weight:600">${cake.time || '-'}</p></div>
      <div style="background:#fff0f8;padding:12px;border-radius:10px"><span style="font-size:0.75rem;color:#999">Rating</span><p style="font-weight:600">⭐ ${cake.rating || 0} (${cake.reviews || 0})</p></div>
    </div>
    <div style="display:flex;align-items:center;gap:15px;margin-bottom:20px">
      <span style="font-weight:600">Quantity:</span>
      <button class="qty-btn" onclick="changeQty(-1)">−</button>
      <span class="qty-num" id="detailQty">1</span>
      <button class="qty-btn" onclick="changeQty(1)">+</button>
    </div>
    <button class="btn btn-primary" style="width:100%;padding:14px;font-size:1rem" onclick="addToCartFromDetail('${cake.id}')">Add to Cart 🛒</button>
  `;
  openModal('cakeDetailModal');
}

function changeQty(delta) {
  const el = document.getElementById('detailQty');
  let qty = parseInt(el.textContent) + delta;
  if (qty < 1) qty = 1;
  el.textContent = qty;
}

function addToCartFromDetail(cakeId) {
  const qty = parseInt(document.getElementById('detailQty').textContent);
  addToCart(cakeId, qty);
  closeModal('cakeDetailModal');
}

window.customerOrders = [];

function viewOrderDetails(orderId) {
  const o = window.customerOrders.find(x => x._id === orderId);
  if (!o) return showToast('Order not found', 'error');

  const content = document.getElementById('orderDetailContent');
  const subtotal = o.total - (o.deliveryCharge || 50);

  content.innerHTML = `
    <div style="border-bottom:1px solid #eee; padding-bottom: 15px; margin-bottom: 15px;">
      <h2 style="margin-bottom:5px">Order Details</h2>
      <p style="color:#666; font-size:0.9rem">ID: ${o._id}</p>
      <p style="color:#666; font-size:0.9rem">Placed on ${new Date(o.createdAt).toLocaleDateString()} at ${new Date(o.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
      <div style="margin-top: 10px;">
        <span class="badge badge-${o.status.toLowerCase().replace(/\s+/g, '-')}">${o.status}</span>
      </div>
    </div>
    
    <h4 style="margin-bottom: 10px">Items</h4>
    <div style="background:#f8f9fa; border-radius:8px; padding:15px; margin-bottom: 15px;">
      ${o.items.map(i => `
        <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:0.95rem;">
          <span>${i.emoji || '🎂'} ${i.name} ×${i.qty}</span>
          <span>₹${(i.price * i.qty).toLocaleString()}</span>
        </div>
      `).join('')}
      <div style="border-top:1px solid #ddd; margin-top:10px; padding-top:10px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:5px; font-size:0.9rem; color:#666">
          <span>Subtotal</span><span>₹${subtotal.toLocaleString()}</span>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:5px; font-size:0.9rem; color:#666">
          <span>Delivery Charge</span><span>₹${(o.deliveryCharge || 50).toLocaleString()}</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-weight:bold; color:#e91e8c; font-size:1.1rem; margin-top:5px;">
          <span>Total</span><span>₹${o.total.toLocaleString()}</span>
        </div>
      </div>
    </div>

    <h4 style="margin-bottom: 10px">Delivery Information</h4>
    <div style="background:#f8f9fa; border-radius:8px; padding:15px; font-size:0.9rem; color:#555;">
      <p style="margin-bottom:5px"><strong>Phone:</strong> ${o.phone || 'N/A'}</p>
      <p style="margin:0"><strong>Address:</strong><br/>${o.deliveryAddress ? o.deliveryAddress.replace(/</g, "&lt;").replace(/>/g, "&gt;") : 'N/A'}</p>
    </div>
    
    <div style="margin-top: 20px;">
      ${getStatusTimeline(o.status)}
    </div>
  `;
  openModal('orderDetailModal');
}

async function loadClientOrders() {
  const container = document.getElementById('clientOrdersList');
  container.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">Loading your orders...</div>';
  
  try {
    const myOrders = await api.get('/orders/myorders');
    window.customerOrders = myOrders;
    
    if (myOrders.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:60px;color:#999"><div style="font-size:4rem;margin-bottom:15px">📦</div><p>You haven\'t placed any orders yet.</p><button class="btn btn-primary" style="margin-top:15px" onclick="showClientSection(\'browse\')">Browse Cakes</button></div>';
      return;
    }
    
    container.innerHTML = myOrders.map(o => `
      <div class="dash-card" style="margin-bottom:15px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px">
          <div>
            <h4 style="margin-bottom:5px">Order #${o._id.substring(o._id.length-6).toUpperCase()}</h4>
            <p style="color:#999;font-size:0.85rem">${new Date(o.createdAt).toLocaleDateString()}</p>
          </div>
          <div style="text-align:right">
            <div style="font-weight:700;color:#e91e8c;margin-bottom:5px">₹${o.total.toLocaleString()}</div>
            <span class="badge badge-${o.status.toLowerCase().replace(/\s+/g, '-')}">${o.status}</span>
          </div>
        </div>
        <div style="margin-top:15px;text-align:right">
          <button class="btn btn-outline" style="padding:6px 12px;font-size:0.85rem" onclick="viewOrderDetails('${o._id}')">View Details</button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Failed to load orders', error);
    container.innerHTML = '<div style="text-align:center;padding:40px;color:#e91e8c;">Unable to load your orders. Please try again.</div>';
    showToast('Unable to load your orders.', 'error');
  }
}

function getStatusTimeline(status) {
  const steps = ['Pending', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered'];
  if (status === 'Cancelled') return '<div style="color:#dc2626;font-weight:bold;margin-top:10px;text-align:center;">Order Cancelled</div>';
  
  const idx = steps.indexOf(status);
  return `<div style="display:flex;gap:0;margin-top:10px">
    ${steps.map((s, i) => `
      <div style="flex:1;text-align:center">
        <div style="width:28px;height:28px;border-radius:50%;background:${i <= idx ? '#e91e8c' : '#eee'};color:${i <= idx ? '#fff' : '#999'};display:flex;align-items:center;justify-content:center;margin:0 auto;font-size:0.75rem;font-weight:700">${i + 1}</div>
        <div style="font-size:0.7rem;margin-top:5px;color:${i <= idx ? '#e91e8c' : '#999'}">${s}</div>
        ${i < steps.length - 1 ? `<div style="position:relative"></div>` : ''}
      </div>
    `).join('')}
  </div>`;
}

async function loadProfile() {
  const nameEl = document.getElementById('profileName');
  const emailEl = document.getElementById('profileEmail');
  const initEl = document.getElementById('profileInitial');
  const editName = document.getElementById('editName');
  const editEmail = document.getElementById('editEmail');
  const editPhone = document.getElementById('editPhone');

  if (nameEl) nameEl.textContent = 'Loading...';

  try {
    const response = await api.get('/auth/profile');
    const profile = response.data || response;

    // Update local cache for navigation/sync
    DB.currentUser = { ...DB.currentUser, ...profile };
    localStorage.setItem('pc_current_user', JSON.stringify(DB.currentUser));

    if (nameEl) nameEl.textContent = profile.name;
    if (emailEl) emailEl.textContent = profile.email;
    if (profile.name) {
      if (initEl) initEl.textContent = profile.name[0].toUpperCase();
      const sidebarInit = document.getElementById('clientInitial');
      if (sidebarInit) sidebarInit.textContent = profile.name[0].toUpperCase();
    }
    const sidebarName = document.getElementById('clientName');
    if (sidebarName) sidebarName.textContent = profile.name;

    if (editName) editName.value = profile.name || '';
    if (editEmail) editEmail.value = profile.email || '';
    if (editPhone) editPhone.value = profile.phone || '';
  } catch (error) {
    console.error('Failed to load profile', error);
    if (nameEl) nameEl.textContent = 'Error loading profile';
    showToast(error.message || 'Unable to load profile data', 'error');
  }
}

async function saveProfile() {
  const name = document.getElementById('editName').value.trim();
  const phone = document.getElementById('editPhone').value.trim();
  const password = document.getElementById('editPassword') ? document.getElementById('editPassword').value : '';

  if (!name) { showToast('Name is required', 'error'); return; }

  const btn = document.querySelector('#csec-profile button.btn-primary');
  const originalText = btn ? btn.innerHTML : '';
  if (btn) { btn.innerHTML = 'Saving...'; btn.disabled = true; }

  try {
    const payload = { name, phone };
    if (password) payload.password = password;

    const response = await api.put('/auth/profile', payload);
    const updatedUser = response.data || response;

    DB.currentUser = { ...DB.currentUser, ...updatedUser };
    localStorage.setItem('pc_current_user', JSON.stringify(DB.currentUser));

    document.getElementById('clientName').textContent = updatedUser.name;
    document.getElementById('clientInitial').textContent = updatedUser.name[0].toUpperCase();

    await loadProfile();
    if (document.getElementById('editPassword')) document.getElementById('editPassword').value = '';

    showToast('Profile updated!', 'success');
  } catch (error) {
    console.error('Failed to update profile:', error);
    showToast(error.message || 'Failed to update profile', 'error');
  } finally {
    if (btn) { btn.innerHTML = originalText; btn.disabled = false; }
  }
}

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
function toggleSidebar() { document.getElementById('dashSidebar').classList.toggle('open'); }
