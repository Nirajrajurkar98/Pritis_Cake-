const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
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
  document.getElementById('totalOrders').textContent = '-';
  document.getElementById('totalRevenue').textContent = '-';
  document.getElementById('totalCakes').textContent = '-';
  document.getElementById('totalCustomers').textContent = '-';

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
    `).join('') : '<tr><td colspan="6" class="empty-state">No recent orders found.</td></tr>';

    // Mini chart bars
      } catch(err) {
    showToast('Failed to load dashboard data', 'error');
  }
}

function getCakeMediaHtml(cake) {
  if (cake.image) {
    const imgUrl = cake.image.startsWith('http') ? cake.image : `http://localhost:5000${cake.image}`;
    return `<img src="${imgUrl}" alt="${cake.name}">`;
  }
  return cake.emoji || '';
}

// ===== CAKES =====
let allCakes = [];
let cakeToDeleteId = null;

async function loadCakes() {
  const grid = document.getElementById('cakesGrid');
  grid.innerHTML = '<div class="state-loading" style="grid-column:1/-1;">Loading cakes...</div>';
  
  try {
    allCakes = await api.get('/admin/cakes');
    renderCakes(allCakes);
  } catch(err) {
    console.error(err);
    grid.innerHTML = '<div class="state-error" style="grid-column:1/-1;">Unable to load cakes. Please try again.</div>';
  }
}

function renderCakes(cakesToRender) {
  const grid = document.getElementById('cakesGrid');
  if (cakesToRender.length === 0) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;border-radius:8px;border:1px solid #e5e7eb;">No cakes available.<br><small style="color:#9ca3af;margin-top:4px;display:block;">Add your first cake to start building the catalog.</small></div>';
    return;
  }

  grid.innerHTML = cakesToRender.map(cake => `
    <div class="admin-cake-card">
      <div class="admin-cake-img" style="height:180px;background:#f9fafb;display:flex;align-items:center;justify-content:center;border-bottom:1px solid #e5e7eb;overflow:hidden">
        ${cake.image 
          ? `<img src="${cake.image.startsWith('http') ? cake.image : 'http://localhost:5000' + cake.image}" alt="${cake.name}" style="width:100%;height:100%;object-fit:cover;" onerror="this.onerror=null; this.outerHTML='<span style=\'font-size:0.875rem;color:#9ca3af;\'>Image unavailable</span>';">` 
          : `<span style="font-size:0.875rem;color:#9ca3af;">No image</span>`
        }
      </div>
      <div class="admin-cake-info" style="padding:16px;">
        <h4 style="font-size:1rem;font-weight:600;color:#111827;margin:0 0 4px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${cake.name}">${cake.name}</h4>
        <div style="font-size:0.8125rem;color:#6b7280;margin-bottom:8px;text-transform:capitalize;">${cake.category}</div>
        <div class="price" style="font-size:1.125rem;font-weight:700;color:#111827;margin-bottom:16px;">${formatCurrency(cake.price)}</div>
        <div class="admin-cake-actions" style="display:flex;gap:8px;">
          <button class="btn-sm btn-edit" style="flex:1" onclick="editCake('${cake._id}')">Edit</button>
          <button class="btn-sm btn-delete" style="flex:1" onclick="deleteCake('${cake._id}', '${cake.name.replace(/'/g, "\'")}')">Delete</button>
        </div>
      </div>
    </div>
  `).join('');
}

function filterCakes(e) {
  const query = e.target.value.toLowerCase().trim();
  if (!query) return renderCakes(allCakes);
  
  const filtered = allCakes.filter(c => 
    c.name.toLowerCase().includes(query) || 
    c.category.toLowerCase().includes(query)
  );
  renderCakes(filtered);
}

function openAddCakeModal() {
  document.getElementById('cakeModalTitle').textContent = 'Add Cake';
  document.getElementById('editCakeId').value = '';
  document.getElementById('cakeName').value = '';
  document.getElementById('cakeCategory').value = 'Birthday';
  document.getElementById('cakePrice').value = '';
  document.getElementById('cakeDesc').value = '';
  document.getElementById('cakeWeight').value = '';
  document.getElementById('cakeTime').value = '';
  document.getElementById('cakeServes').value = '';
  
  const fileInput = document.getElementById('cakeImage');
  fileInput.value = '';
  document.getElementById('cakeImagePreview').style.display = 'none';
  document.getElementById('cakeImageRequired').textContent = '(Required)';
  document.getElementById('cakeFormError').style.display = 'none';
  
  openModal('cakeModal');
}

async function editCake(id) {
  const cake = allCakes.find(c => c._id === id);
  if (!cake) return;
  
  document.getElementById('cakeModalTitle').textContent = 'Edit Cake';
  document.getElementById('editCakeId').value = id;
  document.getElementById('cakeName').value = cake.name || '';
  document.getElementById('cakeCategory').value = cake.category || 'Birthday';
  document.getElementById('cakePrice').value = cake.price || 0;
  document.getElementById('cakeDesc').value = cake.desc || '';
  document.getElementById('cakeWeight').value = cake.weight || '';
  document.getElementById('cakeTime').value = cake.time || '';
  document.getElementById('cakeServes').value = cake.serves || '';
  
  const fileInput = document.getElementById('cakeImage');
  fileInput.value = '';
  document.getElementById('cakeImageRequired').textContent = '(Optional)';
  document.getElementById('cakeFormError').style.display = 'none';
  
  const previewDiv = document.getElementById('cakeImagePreview');
  const previewImg = document.getElementById('cakeImagePreviewImg');
  
  if (cake.image) {
    previewImg.src = cake.image.startsWith('http') ? cake.image : 'http://localhost:5000' + cake.image;
    previewImg.onerror = function() { previewImg.src = ''; previewDiv.style.display = 'none'; };
    previewDiv.style.display = 'flex';
  } else {
    previewDiv.style.display = 'none';
  }
  
  openModal('cakeModal');
}

async function saveCake() {
  const errDiv = document.getElementById('cakeFormError');
  errDiv.style.display = 'none';
  errDiv.textContent = '';
  
  const id = document.getElementById('editCakeId').value;
  const name = document.getElementById('cakeName').value.trim();
  const category = document.getElementById('cakeCategory').value;
  const price = document.getElementById('cakePrice').value;
  const desc = document.getElementById('cakeDesc').value.trim();
  const fileInput = document.getElementById('cakeImage');
  
  if (!name) {
    errDiv.textContent = 'Cake Name is required.';
    errDiv.style.display = 'block';
    return;
  }
  if (!price || parseFloat(price) < 0) {
    errDiv.textContent = 'Price must be a valid positive number.';
    errDiv.style.display = 'block';
    return;
  }
  if (!desc) {
    errDiv.textContent = 'Description is required.';
    errDiv.style.display = 'block';
    return;
  }
  if (!id && !fileInput.files[0]) {
    errDiv.textContent = 'Cake Image is required for new cakes.';
    errDiv.style.display = 'block';
    return;
  }
  
  const btn = document.getElementById('btnSaveCake');
  const originalText = btn.textContent;
  btn.textContent = 'Saving...';
  btn.disabled = true;
  document.getElementById('btnCancelCake').disabled = true;

  try {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('category', category);
    formData.append('price', price);
    formData.append('desc', desc);
    formData.append('weight', document.getElementById('cakeWeight').value.trim());
    formData.append('time', document.getElementById('cakeTime').value.trim());
    formData.append('serves', document.getElementById('cakeServes').value.trim());
    
    if (fileInput.files[0]) {
      formData.append('image', fileInput.files[0]);
    }
    
    if (id) {
      await api.putMultipart(`/admin/cakes/${id}`, formData);
      showToast('Cake updated successfully.');
    } else {
      await api.postMultipart(`/admin/cakes`, formData);
      showToast('Cake added successfully.');
    }
    closeModal('cakeModal');
    loadCakes();
  } catch(err) {
    errDiv.textContent = err.message || 'Failed to save cake.';
    errDiv.style.display = 'block';
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
    document.getElementById('btnCancelCake').disabled = false;
  }
}

function deleteCake(id, name) {
  cakeToDeleteId = id;
  document.getElementById('deleteConfirmText').innerHTML = `Are you sure you want to delete <strong>"${name}"</strong>?<br>This action cannot be undone.`;
  openModal('deleteConfirmModal');
}

async function executeDeleteCake() {
  if (!cakeToDeleteId) return;
  
  const btn = document.getElementById('btnConfirmDelete');
  btn.textContent = 'Deleting...';
  btn.disabled = true;
  
  try {
    await api.delete(`/admin/cakes/${cakeToDeleteId}`);
    showToast('Cake deleted successfully.');
    closeModal('deleteConfirmModal');
    loadCakes();
  } catch(err) {
    showToast(err.message || 'Failed to delete cake.', 'error');
  } finally {
    btn.textContent = 'Delete Cake';
    btn.disabled = false;
    cakeToDeleteId = null;
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
    `).join('') : '<tr><td colspan="7" class="empty-state">No orders found.</td></tr>';
  } catch(err) {
    tbody.innerHTML = '<tr><td colspan="7" class="state-error" style="display:table-cell;">Failed to load orders</td></tr>';
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
      <tbody>${o.items.map(i => `<tr><td>${i.name}</td><td>${i.qty}</td><td>₹${i.price}</td><td>₹${i.price * i.qty}</td></tr>`).join('')}</tbody></table>
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
  tbody.innerHTML = '<tr><td colspan="6" class="state-loading">Loading customers...</td></tr>';
  
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
    }).join('') : '<tr><td colspan="6" class="empty-state">No customers found.</td></tr>';
  } catch(err) {
    tbody.innerHTML = '<tr><td colspan="6" class="state-error" style="display:table-cell;">Failed to load customers</td></tr>';
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

// Cake Image Preview Listener
const cakeImageInput = document.getElementById('cakeImage');
if (cakeImageInput) {
  cakeImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    const previewDiv = document.getElementById('cakeImagePreview');
    const previewImg = document.getElementById('cakeImagePreviewImg');
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        previewImg.src = e.target.result;
        previewDiv.style.display = 'flex';
      };
      reader.readAsDataURL(file);
    }
  });
}
