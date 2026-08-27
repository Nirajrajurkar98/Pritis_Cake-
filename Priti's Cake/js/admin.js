document.addEventListener('DOMContentLoaded', () => {
  // Auth check
  if (!isAdmin()) { window.location.href = 'login.html'; return; }

  document.getElementById('adminName').textContent = DB.currentUser.name;
  loadDashboard();
  showSection('dashboard');
});

function showSection(id) {
  document.querySelectorAll('.dash-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  const sec = document.getElementById('sec-' + id);
  const link = document.getElementById('link-' + id);
  if (sec) sec.classList.add('active');
  if (link) link.classList.add('active');
  document.getElementById('pageTitle').textContent = {
    dashboard: 'Dashboard Overview', cakes: 'Manage Cakes',
    orders: 'Manage Orders', customers: 'Customers', settings: 'Settings'
  }[id] || 'Dashboard';

  if (id === 'cakes') loadCakes();
  if (id === 'orders') loadOrders();
  if (id === 'customers') loadCustomers();
  if (id === 'dashboard') loadDashboard();
}

function loadDashboard() {
  const orders = DB.orders;
  const revenue = orders.reduce((s, o) => s + o.total, 0);
  document.getElementById('totalOrders').textContent = orders.length;
  document.getElementById('totalRevenue').textContent = '₹' + revenue.toLocaleString();
  document.getElementById('totalCakes').textContent = DB.cakes.length;
  document.getElementById('totalCustomers').textContent = DB.users.length;

  // Recent orders
  const tbody = document.getElementById('recentOrdersBody');
  const recent = [...orders].reverse().slice(0, 5);
  tbody.innerHTML = recent.length ? recent.map(o => `
    <tr>
      <td><strong>${o.id}</strong></td>
      <td>${o.userName}</td>
      <td>${o.items.map(i => i.name).join(', ')}</td>
      <td><strong>₹${o.total}</strong></td>
      <td><span class="badge badge-${o.status.toLowerCase()}">${o.status}</span></td>
      <td>${o.date}</td>
    </tr>
  `).join('') : '<tr><td colspan="6" style="text-align:center;color:#999;padding:30px">No orders yet</td></tr>';

  // Mini chart bars
  const chartEl = document.getElementById('miniChart');
  if (chartEl) {
    const heights = [40, 65, 50, 80, 60, 90, 75];
    chartEl.innerHTML = heights.map(h => `<div class="bar" style="height:${h}%"></div>`).join('');
  }
}

// ===== CAKES =====
function loadCakes() {
  const grid = document.getElementById('cakesGrid');
  grid.innerHTML = DB.cakes.map(cake => `
    <div class="admin-cake-card">
      <div class="admin-cake-img">${cakeMedia(cake)}</div>
      <div class="admin-cake-info">
        <h4>${cake.name}</h4>
        <div style="font-size:0.8rem;color:#999;margin-bottom:5px">${cake.category}</div>
        <div class="price">₹${cake.price}</div>
        <div class="admin-cake-actions">
          <button class="btn-sm btn-edit" onclick="editCake(${cake.id})">✏️ Edit</button>
          <button class="btn-sm btn-delete" onclick="deleteCake(${cake.id})">🗑️ Delete</button>
        </div>
      </div>
    </div>
  `).join('');
}

function openAddCakeModal() {
  document.getElementById('cakeModalTitle').textContent = 'Add New Cake';
  const form = document.getElementById('cakeForm');
  if (form) form.reset();
  document.getElementById('editCakeId').value = '';
  ['cakeName', 'cakePrice', 'cakeEmoji', 'cakeWeight', 'cakeServes', 'cakeTime', 'cakeTag', 'cakeDesc'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('cakeCategory').value = 'Birthday';
  const fileInput = document.getElementById('cakeImage');
  if (fileInput) fileInput.value = '';
  const preview = document.getElementById('cakeImagePreview');
  if (preview) preview.style.display = 'none';
  openModal('cakeModal');
}

function editCake(id) {
  const cake = DB.cakes.find(c => c.id === id);
  if (!cake) return;
  document.getElementById('cakeModalTitle').textContent = 'Edit Cake';
  document.getElementById('editCakeId').value = id;
  document.getElementById('cakeName').value = cake.name;
  document.getElementById('cakeCategory').value = cake.category;
  document.getElementById('cakePrice').value = cake.price;
  document.getElementById('cakeEmoji').value = cake.emoji;
  document.getElementById('cakeWeight').value = cake.weight;
  document.getElementById('cakeServes').value = cake.serves;
  document.getElementById('cakeTime').value = cake.time;
  document.getElementById('cakeTag').value = cake.tag || '';
  document.getElementById('cakeDesc').value = cake.desc;
  const fileInput = document.getElementById('cakeImage');
  if (fileInput) fileInput.value = '';
  const preview = document.getElementById('cakeImagePreview');
  const previewImg = document.getElementById('cakeImagePreviewImg');
  if (preview && previewImg) {
    if (cake.image) { previewImg.src = cake.image; preview.style.display = 'block'; }
    else preview.style.display = 'none';
  }
  openModal('cakeModal');
}

function saveCake() {
  const id = document.getElementById('editCakeId').value;
  const data = {
    name: document.getElementById('cakeName').value.trim(),
    category: document.getElementById('cakeCategory').value,
    price: parseInt(document.getElementById('cakePrice').value),
    emoji: document.getElementById('cakeEmoji').value.trim() || '🎂',
    weight: document.getElementById('cakeWeight').value.trim(),
    serves: document.getElementById('cakeServes').value.trim(),
    time: document.getElementById('cakeTime').value.trim(),
    tag: document.getElementById('cakeTag').value.trim(),
    desc: document.getElementById('cakeDesc').value.trim(),
    rating: 4.5, reviews: 0
  };
  if (!data.name || !data.price) { showToast('Please fill required fields', 'error'); return; }
  const existing = id ? DB.cakes.find(c => c.id == id) : null;
  const fileInput = document.getElementById('cakeImage');
  const finish = (image) => {
    data.image = image || (existing ? existing.image : '');
    if (id) {
      const idx = DB.cakes.findIndex(c => c.id == id);
      if (idx !== -1) DB.cakes[idx] = { ...DB.cakes[idx], ...data };
      showToast('Cake updated successfully! ✅', 'success');
    } else {
      data.id = Date.now();
      DB.cakes.push(data);
      showToast('Cake added successfully! 🎂', 'success');
    }
    saveData();
    closeModal('cakeModal');
    loadCakes();
    loadDashboard();
  };
  if (fileInput && fileInput.files && fileInput.files[0]) {
    resizeImageFile(fileInput.files[0], finish);
  } else {
    finish(null);
  }
}

function deleteCake(id) {
  if (!confirm('Delete this cake?')) return;
  DB.cakes = DB.cakes.filter(c => c.id !== id);
  saveData();
  loadCakes();
  loadDashboard();
  showToast('Cake deleted', 'error');
}

// ===== ORDERS =====
function loadOrders() {
  const tbody = document.getElementById('ordersBody');
  const orders = [...DB.orders].reverse();
  tbody.innerHTML = orders.length ? orders.map(o => `
    <tr>
      <td><strong>${o.id}</strong></td>
      <td>${o.userName}<br><small style="color:#999">${o.userEmail}</small></td>
      <td>${o.items.map(i => `${i.name} ×${i.qty}`).join('<br>')}</td>
      <td><strong>₹${o.total}</strong></td>
      <td>
        <select class="badge" onchange="updateOrderStatus('${o.id}', this.value)" style="border:none;cursor:pointer;padding:4px 8px;border-radius:20px">
          ${['Pending','Confirmed','Baking','Delivered','Cancelled'].map(s =>
            `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s}</option>`
          ).join('')}
        </select>
      </td>
      <td>${o.date}</td>
      <td><button class="btn-sm btn-view" onclick="viewOrder('${o.id}')">View</button></td>
    </tr>
  `).join('') : '<tr><td colspan="7" style="text-align:center;color:#999;padding:30px">No orders yet</td></tr>';
}

function updateOrderStatus(orderId, status) {
  const order = DB.orders.find(o => o.id === orderId);
  if (order) { order.status = status; saveData(); showToast(`Order ${orderId} marked as ${status}`, 'success'); }
}

function viewOrder(orderId) {
  const o = DB.orders.find(o => o.id === orderId);
  if (!o) return;
  document.getElementById('orderDetailContent').innerHTML = `
    <div class="order-detail-grid">
      <div class="order-detail-item"><span>Order ID</span><p>${o.id}</p></div>
      <div class="order-detail-item"><span>Date</span><p>${o.date} ${o.time}</p></div>
      <div class="order-detail-item"><span>Customer</span><p>${o.userName}</p></div>
      <div class="order-detail-item"><span>Email</span><p>${o.userEmail}</p></div>
      <div class="order-detail-item"><span>Status</span><p><span class="badge badge-${o.status.toLowerCase()}">${o.status}</span></p></div>
      <div class="order-detail-item"><span>Total</span><p style="color:#e91e8c;font-size:1.1rem">₹${o.total}</p></div>
    </div>
    <h4 style="margin-bottom:12px">Items Ordered</h4>
    <table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr></thead>
    <tbody>${o.items.map(i => `<tr><td>${i.emoji} ${i.name}</td><td>${i.qty}</td><td>₹${i.price}</td><td>₹${i.price * i.qty}</td></tr>`).join('')}</tbody></table>
  `;
  openModal('orderDetailModal');
}

// ===== CUSTOMERS =====
function loadCustomers() {
  const tbody = document.getElementById('customersBody');
  tbody.innerHTML = DB.users.length ? DB.users.map(u => {
    const userOrders = DB.orders.filter(o => o.userId === u.id);
    const spent = userOrders.reduce((s, o) => s + o.total, 0);
    return `
      <tr>
        <td><div style="display:flex;align-items:center;gap:10px">
          <div style="width:35px;height:35px;background:linear-gradient(135deg,#e91e8c,#ff6ec7);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700">${u.name[0]}</div>
          <div><strong>${u.name}</strong><br><small style="color:#999">${u.email}</small></div>
        </div></td>
        <td>${u.phone || 'N/A'}</td>
        <td>${userOrders.length}</td>
        <td><strong>₹${spent.toLocaleString()}</strong></td>
        <td>${u.joinDate}</td>
        <td><span class="badge badge-active">Active</span></td>
      </tr>
    `;
  }).join('') : '<tr><td colspan="6" style="text-align:center;color:#999;padding:30px">No customers yet</td></tr>';
}

// ===== MODAL HELPERS =====
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// ===== SIDEBAR TOGGLE =====
function toggleSidebar() {
  document.getElementById('dashSidebar').classList.toggle('open');
}
