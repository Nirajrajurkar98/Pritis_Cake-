document.addEventListener('DOMContentLoaded', async () => {
  if (window.initPromise) await window.initPromise;
  if (!isLoggedIn() || isAdmin()) { window.location.href = 'login.html'; return; }
  document.getElementById('clientName').textContent = DB.currentUser.name;
  document.getElementById('clientInitial').textContent = DB.currentUser.name[0];
  loadClientDashboard();
  showClientSection('overview');
});

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
  try {
    const myOrders = await api.get('/orders/my-orders');
    const mappedOrders = myOrders.map(o => ({
      ...o,
      id: 'ORD' + o._id.substring(o._id.length - 6).toUpperCase(),
      date: new Date(o.createdAt).toLocaleDateString(),
      time: new Date(o.createdAt).toLocaleTimeString(),
      status: o.status === 'Preparing' ? 'Baking' : o.status
    }));

    const spent = mappedOrders.reduce((s, o) => s + o.total, 0);
    const pending = mappedOrders.filter(o => o.status === 'Pending' || o.status === 'Confirmed' || o.status === 'Baking').length;

    document.getElementById('myOrderCount').textContent = mappedOrders.length;
    document.getElementById('mySpent').textContent = '₹' + spent.toLocaleString();
    document.getElementById('myPending').textContent = pending;

    // Recent orders
    const tbody = document.getElementById('clientRecentOrders');
    const recent = mappedOrders.slice(0, 5);
    tbody.innerHTML = recent.length ? recent.map(o => `
      <tr>
        <td><strong>${o.id}</strong></td>
        <td>${o.items.map(i => i.name).join(', ')}</td>
        <td><strong>₹${o.total}</strong></td>
        <td><span class="badge badge-${o.status.toLowerCase()}">${o.status}</span></td>
        <td>${o.date}</td>
      </tr>
    `).join('') : '<tr><td colspan="5" style="text-align:center;color:#999;padding:30px">No orders yet. <a href="#" onclick="showClientSection(\'browse\')" style="color:#e91e8c">Browse cakes!</a></td></tr>';
  } catch (err) {
    console.error("Failed to load dashboard orders:", err);
    document.getElementById('clientRecentOrders').innerHTML = '<tr><td colspan="5" style="text-align:center;color:#c62828;padding:30px">Failed to load orders. Please try again later.</td></tr>';
  }

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
  const cakes = filter === 'All' ? DB.cakes : DB.cakes.filter(c => c.category === filter);
  const grid = document.getElementById('browseCakesGrid');
  grid.innerHTML = cakes.map(cake => `
    <div class="client-cake-card" onclick="openCakeDetail('${cake.id}')">
        <div class="client-cake-img">${cakeMedia(cake)}</div>
        <div class="client-cake-info">
          <h4>${cake.name}</h4>
          <div style="font-size:0.75rem;color:#999;margin-bottom:5px">${cake.category}</div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div class="price">₹${cake.price}</div>
          <div style="font-size:0.75rem;color:#ffa500">⭐ ${cake.rating}</div>
        </div>
        <button class="btn btn-primary" style="width:100%;margin-top:10px;padding:8px;font-size:0.85rem" onclick="event.stopPropagation();addToCartClient('${cake.id}')">Add to Cart 🛒</button>
      </div>
    </div>
  `).join('');

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
    <p style="color:#666;line-height:1.7;margin-bottom:20px">${cake.desc}</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
      <div style="background:#fff0f8;padding:12px;border-radius:10px"><span style="font-size:0.75rem;color:#999">Weight</span><p style="font-weight:600">${cake.weight}</p></div>
      <div style="background:#fff0f8;padding:12px;border-radius:10px"><span style="font-size:0.75rem;color:#999">Serves</span><p style="font-weight:600">${cake.serves}</p></div>
      <div style="background:#fff0f8;padding:12px;border-radius:10px"><span style="font-size:0.75rem;color:#999">Prep Time</span><p style="font-weight:600">${cake.time}</p></div>
      <div style="background:#fff0f8;padding:12px;border-radius:10px"><span style="font-size:0.75rem;color:#999">Rating</span><p style="font-weight:600">⭐ ${cake.rating} (${cake.reviews})</p></div>
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

async function loadClientOrders() {
  try {
    const myOrders = await api.get('/orders/my-orders');
    const mappedOrders = myOrders.map(o => ({
      ...o,
      id: 'ORD' + o._id.substring(o._id.length - 6).toUpperCase(),
      date: new Date(o.createdAt).toLocaleDateString(),
      time: new Date(o.createdAt).toLocaleTimeString(),
      status: o.status === 'Preparing' ? 'Baking' : o.status
    }));

    const container = document.getElementById('clientOrdersList');
    container.innerHTML = mappedOrders.length ? mappedOrders.map(o => `
      <div class="dash-card" style="margin-bottom:15px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px">
          <div>
            <h4 style="margin-bottom:5px">${o.id}</h4>
            <p style="color:#999;font-size:0.85rem">${o.date} at ${o.time}</p>
          </div>
          <span class="badge badge-${o.status.toLowerCase()}">${o.status}</span>
        </div>
        <div style="margin:15px 0;padding:15px;background:#f8f9fa;border-radius:10px">
          ${o.items.map(i => `<div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:0.9rem"><span>${i.emoji || ''} ${i.name} ×${i.qty}</span><span>₹${i.price * i.qty}</span></div>`).join('')}
          <div style="border-top:1px solid #eee;padding-top:10px;display:flex;justify-content:space-between;font-weight:800;color:#e91e8c"><span>Total</span><span>₹${o.total}</span></div>
        </div>
        ${getStatusTimeline(o.status)}
      </div>
    `).join('') : '<div style="text-align:center;padding:60px;color:#999"><div style="font-size:4rem;margin-bottom:15px">🛒</div><p>No orders yet!</p><button class="btn btn-primary" style="margin-top:15px" onclick="showClientSection(\'browse\')">Browse Cakes</button></div>';
  } catch (err) {
    console.error("Failed to load client orders:", err);
    document.getElementById('clientOrdersList').innerHTML = '<div style="text-align:center;padding:60px;color:#c62828;"><div style="font-size:4rem;margin-bottom:15px">⚠️</div><p>Failed to load orders. Please try again later.</p></div>';
  }
}

function getStatusTimeline(status) {
  if (status === 'Cancelled') {
    return `<div style="margin-top:15px;text-align:center;padding:10px;background:#ffebee;color:#c62828;border-radius:8px;font-weight:bold;">Order Cancelled</div>`;
  }
  
  const steps = ['Pending', 'Confirmed', 'Baking', 'Out for Delivery', 'Delivered'];
  let displayStatus = status;
  if (displayStatus === 'Preparing') displayStatus = 'Baking';
  
  const idx = steps.indexOf(displayStatus);
  // If status is unknown, just don't highlight anything.
  const activeIdx = idx === -1 ? -1 : idx;

  return `<div style="display:flex;gap:0;margin-top:10px">
    ${steps.map((s, i) => `
      <div style="flex:1;text-align:center">
        <div style="width:28px;height:28px;border-radius:50%;background:${i <= activeIdx ? '#e91e8c' : '#eee'};color:${i <= activeIdx ? '#fff' : '#999'};display:flex;align-items:center;justify-content:center;margin:0 auto;font-size:0.75rem;font-weight:700">${i + 1}</div>
        <div style="font-size:0.7rem;margin-top:5px;color:${i <= activeIdx ? '#e91e8c' : '#999'}">${s}</div>
        ${i < steps.length - 1 ? `<div style="position:relative"></div>` : ''}
      </div>
    `).join('')}
  </div>`;
}

function loadProfile() {
  const u = DB.currentUser;
  document.getElementById('profileName').textContent = u.name;
  document.getElementById('profileEmail').textContent = u.email;
  document.getElementById('profileInitial').textContent = u.name[0];
  document.getElementById('editName').value = u.name;
  document.getElementById('editEmail').value = u.email;
  document.getElementById('editPhone').value = u.phone || '';
}

let isSavingProfile = false;

async function saveProfile() {
  if (isSavingProfile) return;
  const name = document.getElementById('editName').value.trim();
  const phone = document.getElementById('editPhone').value.trim();
  if (!name) { showToast('Name is required', 'error'); return; }

  const btn = document.querySelector('button[onclick="saveProfile()"]');
  if (btn) {
    btn.disabled = true;
    btn.innerText = 'Saving...';
  }
  isSavingProfile = true;

  try {
    const res = await api.put('/auth/profile', { name, phone });
    if (res && res.success) {
      DB.currentUser = res.data;
      // Keep session cache consistent
      localStorage.setItem('pc_current_user', JSON.stringify(DB.currentUser));
      
      document.getElementById('clientName').textContent = res.data.name;
      document.getElementById('clientInitial').textContent = res.data.name[0];
      loadProfile();
      
      showToast('Profile updated successfully! 🎉', 'success');
    } else {
      showToast('Failed to update profile.', 'error');
    }
  } catch (err) {
    console.error('Error updating profile:', err);
    showToast(err.message || 'Failed to update profile.', 'error');
  } finally {
    isSavingProfile = false;
    if (btn) {
      btn.disabled = false;
      btn.innerText = 'Save Changes';
    }
  }
}

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
function toggleSidebar() { document.getElementById('dashSidebar').classList.toggle('open'); }
