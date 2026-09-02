document.addEventListener('DOMContentLoaded', async () => {
  // Auth check
  const token = localStorage.getItem('pc_token');
  const adminData = JSON.parse(localStorage.getItem('pc_admin') || 'null');
  
  if (!token || !adminData || adminData.role !== 'admin') {
    window.location.href = 'admin-login.html';
    return;
  }

  document.getElementById('adminName').textContent = adminData.name || 'Admin';
  
  // Set up event listener for image preview
  const fileInput = document.getElementById('cakeImage');
  const previewImg = document.getElementById('cakeImagePreviewImg');
  const previewDiv = document.getElementById('cakeImagePreview');
  
  if (fileInput && previewImg && previewDiv) {
    fileInput.addEventListener('change', function() {
      const file = this.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
          previewImg.src = e.target.result;
          previewDiv.style.display = 'block';
        }
        reader.readAsDataURL(file);
      }
    });
  }

  await showSection('dashboard');
});

async function showSection(id) {
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

  try {
    if (id === 'cakes') await loadCakes();
    if (id === 'orders') await loadOrders();
    if (id === 'customers') await loadCustomers();
    if (id === 'dashboard') await loadDashboard();
    if (id === 'settings') await loadSettings();
  } catch(err) {
    showToast(err.message || 'Error loading section', 'error');
  }
}

async function loadDashboard() {
  document.getElementById('totalOrders').textContent = '...';
  document.getElementById('totalRevenue').textContent = '...';
  document.getElementById('totalCakes').textContent = '...';
  document.getElementById('totalCustomers').textContent = '...';

  try {
    const stats = await api.get('/admin/stats');
    const orders = await api.get('/admin/orders');
    const cakes = await api.get('/admin/cakes');
    
    const revenue = orders.reduce((s, o) => s + o.total, 0);
    document.getElementById('totalOrders').textContent = orders.length;
    document.getElementById('totalRevenue').textContent = '₹' + revenue.toLocaleString();
    document.getElementById('totalCakes').textContent = cakes.length;
    document.getElementById('totalCustomers').textContent = stats.totalCustomers;

    // Recent orders
    const tbody = document.getElementById('recentOrdersBody');
    const recent = orders.slice(0, 5);
    tbody.innerHTML = recent.length ? recent.map(o => `
      <tr>
        <td><strong>${o._id.substring(o._id.length-6).toUpperCase()}</strong></td>
        <td>${o.userName}</td>
        <td>${o.items.map(i => i.name).join(', ')}</td>
        <td><strong>₹${o.total}</strong></td>
        <td><span class="badge badge-${o.status.toLowerCase()}">${o.status}</span></td>
        <td>${new Date(o.createdAt).toLocaleDateString()}</td>
      </tr>
    `).join('') : '<tr><td colspan="6" style="text-align:center;color:#999;padding:30px">No orders yet</td></tr>';

    // Mini chart bars
    const chartEl = document.getElementById('miniChart');
    if (chartEl) {
      const heights = [40, 65, 50, 80, 60, 90, 75];
      chartEl.innerHTML = heights.map(h => `<div class="bar" style="height:${h}%"></div>`).join('');
    }
  } catch(err) {
    showToast('Failed to load dashboard data', 'error');
  }
}

function getCakeMediaHtml(cake) {
  if (cake.image) {
    const imgUrl = cake.image.startsWith('http') ? cake.image : `http://localhost:5000${cake.image}`;
    return `<img src="${imgUrl}" alt="${cake.name}">`;
  }
  return cake.emoji || '🎂';
}

// ===== CAKES =====
async function loadCakes() {
  const grid = document.getElementById('cakesGrid');
  grid.innerHTML = '<div style="text-align:center;width:100%;padding:30px;color:#999">Loading cakes...</div>';
  
  try {
    const cakes = await api.get('/admin/cakes');
    
    if (cakes.length === 0) {
      grid.innerHTML = '<div style="text-align:center;width:100%;padding:30px;color:#999">No cakes available.</div>';
      return;
    }

    grid.innerHTML = cakes.map(cake => `
      <div class="admin-cake-card">
        <div class="admin-cake-img">${getCakeMediaHtml(cake)}</div>
        <div class="admin-cake-info">
          <h4>${cake.name}</h4>
          <div style="font-size:0.8rem;color:#999;margin-bottom:5px">${cake.category}</div>
          <div class="price">₹${cake.price}</div>
          <div class="admin-cake-actions">
            <button class="btn-sm btn-edit" onclick="editCake('${cake._id}')">✏️ Edit</button>
            <button class="btn-sm btn-delete" onclick="deleteCake('${cake._id}')">🗑️ Delete</button>
          </div>
        </div>
      </div>
    `).join('');
  } catch(err) {
    grid.innerHTML = '<div style="text-align:center;width:100%;padding:30px;color:#e91e8c">Failed to load cakes</div>';
  }
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

async function editCake(id) {
  try {
    const cake = await api.get(`/admin/cakes/${id}`);
    document.getElementById('cakeModalTitle').textContent = 'Edit Cake';
    document.getElementById('editCakeId').value = id;
    document.getElementById('cakeName').value = cake.name;
    document.getElementById('cakeCategory').value = cake.category;
    document.getElementById('cakePrice').value = cake.price;
    document.getElementById('cakeEmoji').value = cake.emoji || '';
    document.getElementById('cakeWeight').value = cake.weight || '';
    document.getElementById('cakeServes').value = cake.serves || '';
    document.getElementById('cakeTime').value = cake.time || '';
    document.getElementById('cakeTag').value = cake.tag || '';
    document.getElementById('cakeDesc').value = cake.desc || '';
    
    const fileInput = document.getElementById('cakeImage');
    if (fileInput) fileInput.value = '';
    
    const preview = document.getElementById('cakeImagePreview');
    const previewImg = document.getElementById('cakeImagePreviewImg');
    
    if (preview && previewImg) {
      if (cake.image) { 
        previewImg.src = cake.image.startsWith('http') ? cake.image : `http://localhost:5000${cake.image}`; 
        preview.style.display = 'block'; 
      }
      else preview.style.display = 'none';
    }
    openModal('cakeModal');
  } catch(err) {
    showToast('Failed to load cake details', 'error');
  }
}

async function saveCake() {
  const id = document.getElementById('editCakeId').value;
  const name = document.getElementById('cakeName').value.trim();
  const category = document.getElementById('cakeCategory').value;
  const price = parseInt(document.getElementById('cakePrice').value);
  
  if (!name || isNaN(price) || price < 0) { 
    showToast('Please fill required fields (Valid Name & Price)', 'error'); 
    return; 
  }

  const formData = new FormData();
  formData.append('name', name);
  formData.append('category', category);
  formData.append('price', price);
  formData.append('emoji', document.getElementById('cakeEmoji').value.trim() || '🎂');
  formData.append('weight', document.getElementById('cakeWeight').value.trim());
  formData.append('serves', document.getElementById('cakeServes').value.trim());
  formData.append('time', document.getElementById('cakeTime').value.trim());
  formData.append('tag', document.getElementById('cakeTag').value.trim());
  formData.append('desc', document.getElementById('cakeDesc').value.trim());
  
  const fileInput = document.getElementById('cakeImage');
  if (fileInput && fileInput.files && fileInput.files[0]) {
    formData.append('image', fileInput.files[0]);
  }

  try {
    if (id) {
      await api.putMultipart(`/admin/cakes/${id}`, formData);
      showToast('Cake updated successfully! ✅', 'success');
    } else {
      await api.postMultipart(`/admin/cakes`, formData);
      showToast('Cake added successfully! 🎂', 'success');
    }
    closeModal('cakeModal');
    loadCakes();
  } catch(err) {
    showToast(err.message || 'Failed to save cake', 'error');
  }
}

async function deleteCake(id) {
  if (!confirm('Delete this cake?')) return;
  try {
    await api.delete(`/admin/cakes/${id}`);
    showToast('Cake deleted', 'success');
    loadCakes();
  } catch(err) {
    showToast(err.message || 'Failed to delete cake', 'error');
  }
}

// ===== ORDERS =====
async function loadOrders() {
  const tbody = document.getElementById('ordersBody');
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#999;padding:30px">Loading orders...</td></tr>';
  try {
    const orders = await api.get('/admin/orders');
    tbody.innerHTML = orders.length ? orders.map(o => `
      <tr>
        <td><strong>${o._id.substring(o._id.length-6).toUpperCase()}</strong></td>
        <td>${o.userName}<br><small style="color:#999">${o.userEmail}</small></td>
        <td>${o.items.map(i => `${i.name} ×${i.qty}`).join('<br>')}</td>
        <td><strong>₹${o.total}</strong></td>
        <td>
          <select class="badge badge-${o.status.toLowerCase()}" onchange="updateOrderStatus('${o._id}', this.value)" style="border:none;cursor:pointer;padding:4px 8px;border-radius:20px">
            ${['Pending','Confirmed','Preparing','Out for Delivery','Delivered','Cancelled'].map(s =>
              `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s}</option>`
            ).join('')}
          </select>
        </td>
        <td>${new Date(o.createdAt).toLocaleDateString()}</td>
        <td><button class="btn-sm btn-view" onclick="viewOrder('${o._id}')">View</button></td>
      </tr>
    `).join('') : '<tr><td colspan="7" style="text-align:center;color:#999;padding:30px">No orders yet</td></tr>';
  } catch(err) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#e91e8c;padding:30px">Failed to load orders</td></tr>';
  }
}

async function updateOrderStatus(orderId, status) {
  try {
    await api.put(`/admin/orders/${orderId}/status`, { status });
    showToast(`Order marked as ${status}`, 'success');
    loadOrders(); // reload to sync color
  } catch(err) {
    showToast(err.message || 'Failed to update order status', 'error');
    loadOrders(); // revert UI change
  }
}

async function viewOrder(orderId) {
  try {
    const o = await api.get(`/admin/orders/${orderId}`);
    document.getElementById('orderDetailContent').innerHTML = `
      <div class="order-detail-grid">
        <div class="order-detail-item"><span>Order ID</span><p>${o._id.substring(o._id.length-6).toUpperCase()}</p></div>
        <div class="order-detail-item"><span>Date</span><p>${new Date(o.createdAt).toLocaleString()}</p></div>
        <div class="order-detail-item"><span>Customer</span><p>${o.userName}</p></div>
        <div class="order-detail-item"><span>Email</span><p>${o.userEmail}</p></div>
        <div class="order-detail-item"><span>Status</span><p><span class="badge badge-${o.status.toLowerCase()}">${o.status}</span></p></div>
        <div class="order-detail-item"><span>Total</span><p style="color:#e91e8c;font-size:1.1rem">₹${o.total}</p></div>
      </div>
      <h4 style="margin-bottom:12px">Items Ordered</h4>
      <table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr></thead>
      <tbody>${o.items.map(i => `<tr><td>${i.emoji || '🎂'} ${i.name}</td><td>${i.qty}</td><td>₹${i.price}</td><td>₹${i.price * i.qty}</td></tr>`).join('')}</tbody></table>
    `;
    openModal('orderDetailModal');
  } catch(err) {
    showToast('Failed to load order details', 'error');
  }
}

// ===== CUSTOMERS =====
let searchTimeout;
async function loadCustomers(search = '') {
  const tbody = document.getElementById('customersBody');
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#999;padding:30px">Loading customers...</td></tr>';
  
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  
  try {
    const customers = await api.get(`/admin/customers${query}`);
    tbody.innerHTML = customers.length ? customers.map(u => {
      return `
        <tr>
          <td><div style="display:flex;align-items:center;gap:10px">
            <div style="width:35px;height:35px;background:linear-gradient(135deg,#e91e8c,#ff6ec7);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700">${u.name ? u.name[0].toUpperCase() : '?'}</div>
            <div><strong>${u.name}</strong><br><small style="color:#999">${u.email}</small></div>
          </div></td>
          <td>${u.phone || 'N/A'}</td>
          <td><button class="btn-sm btn-outline" onclick="viewCustomerOrders('${u._id}')">View Orders</button></td>
          <td>${new Date(u.createdAt).toLocaleDateString()}</td>
          <td><span class="badge badge-active">Active</span></td>
        </tr>
      `;
    }).join('') : '<tr><td colspan="6" style="text-align:center;color:#999;padding:30px">No customers found</td></tr>';
  } catch(err) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#e91e8c;padding:30px">Failed to load customers</td></tr>';
  }
}

function handleCustomerSearch(e) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    loadCustomers(e.target.value);
  }, 500);
}

async function viewCustomerOrders(customerId) {
  try {
    const orders = await api.get(`/admin/customers/${customerId}/orders`);
    let content = `<h4>Customer Orders History</h4><div style="max-height:400px;overflow-y:auto;margin-top:15px;">`;
    
    if (orders.length === 0) {
      content += `<p style="color:#999">No orders found for this customer.</p>`;
    } else {
      content += `<table><thead><tr><th>Order ID</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>`;
      content += orders.map(o => `
        <tr>
          <td>${o._id.substring(o._id.length-6).toUpperCase()}</td>
          <td>${new Date(o.createdAt).toLocaleDateString()}</td>
          <td>₹${o.total}</td>
          <td><span class="badge badge-${o.status.toLowerCase()}">${o.status}</span></td>
        </tr>
      `).join('');
      content += `</tbody></table>`;
    }
    content += `</div>`;
    
    document.getElementById('orderDetailContent').innerHTML = content;
    openModal('orderDetailModal');
  } catch(err) {
    showToast('Failed to load customer orders', 'error');
  }
}

// ===== SETTINGS =====
async function loadSettings() {
  try {
    const res = await api.get('/admin/settings');
    const settings = res.settings;
    
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    };
    
    setVal('setShopName', settings.shopName || '');
    setVal('setEmail', settings.email || '');
    setVal('setPhone', settings.phone || '');
    setVal('setAddress', settings.address || '');
    setVal('setDelivery', settings.deliveryCharge || 0);
    setVal('setMinOrder', settings.minimumOrderAmount || 0);
    setVal('setOpeningTime', settings.openingTime || '10:00');
    setVal('setClosingTime', settings.closingTime || '21:00');
    
  } catch(err) {
    showToast('Failed to load settings', 'error');
  }
}

async function saveSettings() {
  const payload = {
    shopName: document.getElementById('setShopName').value.trim(),
    email: document.getElementById('setEmail').value.trim(),
    phone: document.getElementById('setPhone').value.trim(),
    address: document.getElementById('setAddress').value.trim(),
    openingTime: document.getElementById('setOpeningTime').value.trim(),
    closingTime: document.getElementById('setClosingTime').value.trim(),
    deliveryCharge: parseInt(document.getElementById('setDelivery').value || 0),
    minimumOrderAmount: parseInt(document.getElementById('setMinOrder').value || 0)
  };
  
  if (payload.deliveryCharge < 0 || payload.minimumOrderAmount < 0) {
    showToast('Monetary values cannot be negative', 'error');
    return;
  }
  
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (payload.openingTime && !timeRegex.test(payload.openingTime)) {
    showToast('Invalid opening time format (HH:MM)', 'error');
    return;
  }
  if (payload.closingTime && !timeRegex.test(payload.closingTime)) {
    showToast('Invalid closing time format (HH:MM)', 'error');
    return;
  }
  
  try {
    await api.put('/admin/settings', payload);
    showToast('Settings saved! ✅', 'success');
  } catch(err) {
    showToast(err.message || 'Failed to save settings', 'error');
  }
}

function logout() {
  localStorage.removeItem('pc_token');
  localStorage.removeItem('pc_admin');
  window.location.href = 'admin-login.html';
}

// ===== MODAL HELPERS =====
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// ===== SIDEBAR TOGGLE =====
function toggleSidebar() {
  document.getElementById('dashSidebar').classList.toggle('open');
}
