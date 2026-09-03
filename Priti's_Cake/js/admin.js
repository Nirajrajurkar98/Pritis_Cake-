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
          <button type="button" class="btn-sm btn-edit" style="flex:1" onclick="event.preventDefault(); editCake(\'${cake._id}\')">Edit</button>
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
  tbody.innerHTML = '<tr><td colspan="7" class="state-loading" style="padding:30px">Loading orders...</td></tr>';
  try {
    allOrders = await api.get('/admin/orders');
    renderOrders(allOrders);
  } catch(err) {
    tbody.innerHTML = '<tr><td colspan="7" class="state-error" style="padding:30px">Unable to load orders. Please try again.</td></tr>';
  }
}

function renderOrders(ordersToRender) {
  const tbody = document.getElementById('ordersBody');
  if (!ordersToRender || ordersToRender.length === 0) {
    const isFiltered = document.getElementById('searchOrdersInput').value || document.getElementById('filterOrdersStatus').value;
    const msg = isFiltered ? 'No orders match your current filters.' : 'No orders found.';
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state" style="padding:30px">${msg}</td></tr>`;
    return;
  }
  
  tbody.innerHTML = ordersToRender.map(o => {
    const orderId = o._id.substring(o._id.length-6).toUpperCase();
    const date = new Date(o.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    const itemsText = o.items.map(i => `${i.qty}x ${i.name}`).join('<br>');
    const badgeClass = o.status.toLowerCase().replace(/\s+/g, '-');
    const amount = typeof formatCurrency === 'function' ? formatCurrency(o.total) : o.total;
    
    return `
      <tr id="row-${o._id}">
        <td><strong>#${orderId}</strong></td>
        <td>
          <div style="font-weight:600;color:#111827">${o.userName}</div>
          <div style="font-size:0.8125rem;color:#6b7280">${o.userEmail}</div>
        </td>
        <td style="font-size:0.875rem;color:#4b5563;line-height:1.4">${itemsText}</td>
        <td style="font-size:0.875rem;color:#4b5563">${date}</td>
        <td style="text-align:right;font-weight:600;color:#111827">${amount}</td>
        <td>
          <select class="badge badge-${badgeClass}" data-original="${o.status}" onchange="updateOrderStatus('${o._id}', this)" style="border:1px solid #e5e7eb;cursor:pointer;outline:none;font-family:inherit;padding:4px 8px;border-radius:6px;width:100%;max-width:130px;font-weight:600;appearance:none;text-align:center" id="status-${o._id}">
            ${['Pending','Confirmed','Preparing','Out for Delivery','Delivered','Cancelled'].map(s =>
              `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s}</option>`
            ).join('')}
          </select>
        </td>
        <td style="text-align:right">
          <button type="button" class="btn-sm btn-outline" style="border:1px solid #d1d5db;color:#374151;background:#fff" onclick="event.preventDefault(); viewOrder('${o._id}')">View</button>
        </td>
      </tr>
    `;
  }).join('');
}

function filterOrders() {
  const query = (document.getElementById('searchOrdersInput').value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('filterOrdersStatus').value;
  
  if (!query && !statusFilter) {
    renderOrders(allOrders);
    return;
  }
  
  const filtered = allOrders.filter(o => {
    const matchesSearch = !query || 
      o._id.toLowerCase().includes(query) || 
      o.userName.toLowerCase().includes(query) || 
      o.userEmail.toLowerCase().includes(query);
      
    const matchesStatus = !statusFilter || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  
  renderOrders(filtered);
}

function resetOrderFilters() {
  document.getElementById('searchOrdersInput').value = '';
  document.getElementById('filterOrdersStatus').value = '';
  filterOrders();
}

async function updateOrderStatus(orderId, selectEl) {
  const newStatus = selectEl.value;
  const originalStatus = selectEl.getAttribute('data-original') || allOrders.find(o => o._id === orderId)?.status;
  
  selectEl.disabled = true;
  selectEl.style.opacity = '0.5';
  
  try {
    await api.put(`/admin/orders/${orderId}/status`, { status: newStatus });
    
    // Update local cache
    const orderIndex = allOrders.findIndex(o => o._id === orderId);
    if (orderIndex > -1) {
      allOrders[orderIndex].status = newStatus;
    }
    
    // Update UI silently
    const badgeClass = newStatus.toLowerCase().replace(/\s+/g, '-');
    selectEl.className = `badge badge-${badgeClass}`;
    selectEl.setAttribute('data-original', newStatus);
    showToast(`Order #${orderId.substring(orderId.length-6).toUpperCase()} updated to ${newStatus}`, 'success');
    
    // Update modal if open
    const modalBadge = document.getElementById(`modal-status-badge-${orderId}`);
    if (modalBadge) {
      modalBadge.className = `badge badge-${badgeClass}`;
      modalBadge.textContent = newStatus;
    }
  } catch(err) {
    showToast(err.message || 'Failed to update status', 'error');
    selectEl.value = originalStatus; // revert UI change
  } finally {
    selectEl.disabled = false;
    selectEl.style.opacity = '1';
  }
}

async function viewOrder(orderId) {
  try {
    const o = allOrders.find(ord => ord._id === orderId) || await api.get(`/admin/orders/${orderId}`);
    const orderIdStr = o._id.substring(o._id.length-6).toUpperCase();
    const dateStr = new Date(o.createdAt).toLocaleString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute:'2-digit' });
    const badgeClass = o.status.toLowerCase().replace(/\s+/g, '-');
    const totalAmount = typeof formatCurrency === 'function' ? formatCurrency(o.total) : o.total;
    
    document.getElementById('orderDetailContent').innerHTML = `
      <div style="margin-bottom:24px;display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div>
          <div style="font-size:0.8125rem;color:#6b7280;margin-bottom:4px">Customer</div>
          <div style="font-weight:600;color:#111827">${o.userName}</div>
          <div style="font-size:0.875rem;color:#4b5563">${o.userEmail}</div>
        </div>
        <div>
          <div style="font-size:0.8125rem;color:#6b7280;margin-bottom:4px">Order Status</div>
          <span class="badge badge-${badgeClass}" id="modal-status-badge-${o._id}" style="border:1px solid #e5e7eb;display:inline-block">${o.status}</span>
        </div>
        <div>
          <div style="font-size:0.8125rem;color:#6b7280;margin-bottom:4px">Order ID</div>
          <div style="font-family:monospace;font-size:0.875rem;color:#111827">#${orderIdStr}</div>
        </div>
        <div>
          <div style="font-size:0.8125rem;color:#6b7280;margin-bottom:4px">Order Date</div>
          <div style="font-size:0.875rem;color:#4b5563">${dateStr}</div>
        </div>
      </div>
      
      <h4 style="font-size:1rem;font-weight:600;color:#111827;border-bottom:1px solid #e5e7eb;padding-bottom:12px;margin-bottom:16px">Order Items</h4>
      <div class="table-wrap" style="margin-bottom:24px;overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;min-width:400px">
          <thead>
            <tr style="border-bottom:1px solid #e5e7eb">
              <th style="text-align:left;padding:8px 4px;font-size:0.8125rem;color:#6b7280;font-weight:500">Item</th>
              <th style="text-align:center;padding:8px 4px;font-size:0.8125rem;color:#6b7280;font-weight:500">Qty</th>
              <th style="text-align:right;padding:8px 4px;font-size:0.8125rem;color:#6b7280;font-weight:500">Price</th>
              <th style="text-align:right;padding:8px 4px;font-size:0.8125rem;color:#6b7280;font-weight:500">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${o.items.map(i => `
              <tr style="border-bottom:1px solid #f3f4f6">
                <td style="padding:12px 4px;font-size:0.875rem;color:#111827">${i.name}</td>
                <td style="padding:12px 4px;text-align:center;font-size:0.875rem;color:#4b5563">${i.qty}</td>
                <td style="padding:12px 4px;text-align:right;font-size:0.875rem;color:#4b5563">${typeof formatCurrency === 'function' ? formatCurrency(i.price) : i.price}</td>
                <td style="padding:12px 4px;text-align:right;font-size:0.875rem;font-weight:500;color:#111827">${typeof formatCurrency === 'function' ? formatCurrency(i.price * i.qty) : i.price * i.qty}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <div style="display:flex;justify-content:flex-end">
        <div style="width:250px">
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-top:1px solid #e5e7eb">
            <span style="font-weight:600;color:#111827">Grand Total</span>
            <span style="font-weight:700;color:#111827;font-size:1.125rem">${totalAmount}</span>
          </div>
        </div>
      </div>
    `;
    openModal('orderDetailModal');
  } catch(err) {
    showToast('Failed to load order details', 'error');
  }
}

// ===== CUSTOMERS =====
async function loadCustomers() {
  const tbody = document.getElementById('customersBody');
  tbody.innerHTML = '<tr><td colspan="5" class="state-loading" style="padding:30px">Loading customers...</td></tr>';
  
  try {
    const [custRes, ordRes] = await Promise.all([
      api.get('/admin/customers'),
      allOrders.length > 0 ? Promise.resolve(allOrders) : api.get('/admin/orders')
    ]);
    
    if (allOrders.length === 0 && ordRes.length > 0) {
      allOrders = ordRes;
    }
    
    // Map orders to customers
    allCustomers = custRes.map(c => {
      const userOrders = allOrders.filter(o => o.user === c._id);
      return {
        ...c,
        orderCount: userOrders.length,
        totalSpent: userOrders.reduce((sum, o) => sum + (o.total || 0), 0)
      };
    });
    
    renderCustomers(allCustomers);
  } catch(err) {
    tbody.innerHTML = '<tr><td colspan="5" class="state-error" style="padding:30px">Unable to load customers. Please try again.</td></tr>';
  }
}

function renderCustomers(customersToRender) {
  const tbody = document.getElementById('customersBody');
  if (!customersToRender || customersToRender.length === 0) {
    const isFiltered = document.getElementById('searchCustomersInput').value;
    const msg = isFiltered ? 'No customers match your search.' : 'No customers found.';
    tbody.innerHTML = `<tr><td colspan="5" class="empty-state" style="padding:30px">${msg}</td></tr>`;
    return;
  }
  
  tbody.innerHTML = customersToRender.map(c => {
    const date = new Date(c.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    const initial = c.name ? c.name[0].toUpperCase() : '?';
    const total = typeof formatCurrency === 'function' ? formatCurrency(c.totalSpent) : c.totalSpent;
    
    return `
      <tr>
        <td style="padding:12px">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:36px;height:36px;background:#fdf2f8;border:1px solid #fbcfe8;color:#be185d;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:0.875rem;flex-shrink:0">${initial}</div>
            <div>
              <div style="font-weight:600;color:#111827">${c.name}</div>
              <div style="font-size:0.8125rem;color:#6b7280">${c.email}</div>
              ${c.phone ? `<div style="font-size:0.8125rem;color:#6b7280">${c.phone}</div>` : ''}
            </div>
          </div>
        </td>
        <td style="padding:12px;font-size:0.875rem;color:#4b5563">${date}</td>
        <td style="padding:12px;text-align:right;font-size:0.875rem;font-weight:500;color:#111827">${c.orderCount}</td>
        <td style="padding:12px;text-align:right;font-weight:600;color:#111827">${total}</td>
        <td style="padding:12px;text-align:right">
          <button type="button" class="btn-sm btn-outline" style="border:1px solid #d1d5db;color:#374151;background:#fff" onclick="event.preventDefault(); viewCustomer('${c._id}')">View Details</button>
        </td>
      </tr>
    `;
  }).join('');
}

function filterCustomers() {
  const query = (document.getElementById('searchCustomersInput').value || '').toLowerCase().trim();
  
  if (!query) {
    renderCustomers(allCustomers);
    return;
  }
  
  const filtered = allCustomers.filter(c => {
    return (c.name && c.name.toLowerCase().includes(query)) || 
           (c.email && c.email.toLowerCase().includes(query)) ||
           (c.phone && c.phone.toLowerCase().includes(query));
  });
  
  renderCustomers(filtered);
}

function resetCustomerSearch() {
  document.getElementById('searchCustomersInput').value = '';
  filterCustomers();
}

async function viewCustomer(customerId) {
  try {
    const c = allCustomers.find(cust => cust._id === customerId);
    if (!c) return;
    
    document.getElementById('customerDetailContent').innerHTML = `<div class="state-loading" style="padding:20px">Loading details...</div>`;
    openModal('customerDetailModal');
    
    const userOrders = await api.get(`/admin/customers/${customerId}/orders`);
    const dateStr = new Date(c.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    const totalSpent = typeof formatCurrency === 'function' ? formatCurrency(c.totalSpent) : c.totalSpent;
    
    let ordersHtml = '';
    if (userOrders.length === 0) {
      ordersHtml = `<div class="empty-state" style="padding:24px;border:1px solid #e5e7eb;border-radius:6px;background:#f9fafb;margin-bottom:0">No orders found for this customer.</div>`;
    } else {
      ordersHtml = `
        <div class="table-wrap" style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden">
          <table style="width:100%;border-collapse:collapse;min-width:400px;margin-bottom:0">
            <thead style="background:#f9fafb">
              <tr style="border-bottom:1px solid #e5e7eb">
                <th style="text-align:left;padding:10px 12px;font-size:0.8125rem;color:#6b7280;font-weight:600">Order ID</th>
                <th style="text-align:left;padding:10px 12px;font-size:0.8125rem;color:#6b7280;font-weight:600">Date</th>
                <th style="text-align:left;padding:10px 12px;font-size:0.8125rem;color:#6b7280;font-weight:600">Items</th>
                <th style="text-align:right;padding:10px 12px;font-size:0.8125rem;color:#6b7280;font-weight:600">Amount</th>
                <th style="text-align:right;padding:10px 12px;font-size:0.8125rem;color:#6b7280;font-weight:600">Status</th>
              </tr>
            </thead>
            <tbody>
              ${userOrders.map(o => {
                const badgeClass = o.status.toLowerCase().replace(/\s+/g, '-');
                const orderDate = new Date(o.createdAt).toLocaleDateString();
                const amt = typeof formatCurrency === 'function' ? formatCurrency(o.total) : o.total;
                return `
                <tr style="border-bottom:1px solid #f3f4f6">
                  <td style="padding:12px;font-family:monospace;font-size:0.875rem;color:#111827">#${o._id.substring(o._id.length-6).toUpperCase()}</td>
                  <td style="padding:12px;font-size:0.875rem;color:#4b5563">${orderDate}</td>
                  <td style="padding:12px;font-size:0.875rem;color:#4b5563">${o.items.length} item(s)</td>
                  <td style="padding:12px;text-align:right;font-weight:500;font-size:0.875rem;color:#111827">${amt}</td>
                  <td style="padding:12px;text-align:right"><span class="badge badge-${badgeClass}" style="border:1px solid #e5e7eb">${o.status}</span></td>
                </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
    
    document.getElementById('customerDetailContent').innerHTML = `
      <div style="margin-bottom:24px;display:grid;grid-template-columns:1fr 1fr;gap:16px;background:#f9fafb;padding:16px;border-radius:8px;border:1px solid #e5e7eb">
        <div>
          <div style="font-size:0.8125rem;color:#6b7280;margin-bottom:4px;font-weight:500;text-transform:uppercase;letter-spacing:0.05em">Customer Info</div>
          <div style="font-weight:600;color:#111827;font-size:1.125rem">${c.name}</div>
          <div style="font-size:0.875rem;color:#4b5563;margin-top:2px">${c.email}</div>
          ${c.phone ? `<div style="font-size:0.875rem;color:#4b5563;margin-top:2px">${c.phone}</div>` : ''}
          <div style="font-size:0.875rem;color:#6b7280;margin-top:6px">Joined: ${dateStr}</div>
        </div>
        <div style="text-align:right;display:flex;flex-direction:column;justify-content:center">
          <div style="font-size:0.8125rem;color:#6b7280;margin-bottom:4px;font-weight:500;text-transform:uppercase;letter-spacing:0.05em">Total Spent</div>
          <div style="font-weight:700;color:#be185d;font-size:1.5rem">${totalSpent}</div>
          <div style="font-size:0.875rem;color:#4b5563;margin-top:4px">${c.orderCount} Total Orders</div>
        </div>
      </div>
      
      <h4 style="font-size:1rem;font-weight:600;color:#111827;margin-bottom:16px">Order History</h4>
      ${ordersHtml}
    `;
  } catch(err) {
    document.getElementById('customerDetailContent').innerHTML = `<div class="state-error" style="padding:20px">Failed to load customer details. Please try again.</div>`;
  }
}

// ===== SETTINGS =====
async function loadSettings() {
  const loadingState = document.getElementById('settingsLoadingState');
  const errorState = document.getElementById('settingsErrorState');
  const formContainer = document.getElementById('settingsFormContainer');
  
  if (loadingState) loadingState.style.display = 'block';
  if (errorState) errorState.style.display = 'none';
  if (formContainer) formContainer.style.display = 'none';
  
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
    
    if (loadingState) loadingState.style.display = 'none';
    if (formContainer) formContainer.style.display = 'block';
    
  } catch(err) {
    showToast('Failed to load settings', 'error');
    if (loadingState) loadingState.style.display = 'none';
    if (errorState) errorState.style.display = 'block';
  }
}

async function saveSettings() {
  const btn = document.getElementById('btnSaveSettings');
  const originalText = btn.textContent;
  
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
  
  btn.disabled = true;
  btn.textContent = 'Saving...';
  btn.style.opacity = '0.7';
  
  try {
    await api.put('/admin/settings', payload);
    showToast('Settings saved successfully.', 'success');
    btn.textContent = 'Saved';
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = originalText;
      btn.style.opacity = '1';
    }, 2000);
  } catch(err) {
    showToast(err.message || 'Unable to save settings. Please try again.', 'error');
    btn.disabled = false;
    btn.textContent = originalText;
    btn.style.opacity = '1';
  }
}

function logout() {
  localStorage.removeItem('pc_token');
  localStorage.removeItem('pc_admin');
  window.location.href = 'admin-login.html';
}

// ===== MODAL HELPERS =====
let activeModalId = null;

function openModal(id) { 
  const el = document.getElementById(id);
  if(el) {
    el.classList.add('active'); 
    activeModalId = id;
    document.body.style.overflow = 'hidden'; // prevent bg scroll
  }
}

function closeModal(id) { 
  const el = document.getElementById(id);
  if(el) {
    el.classList.remove('active');
    if(activeModalId === id) activeModalId = null;
    
    // Check if any other modals are still open before restoring scroll
    if(!document.querySelector('.modal-overlay.active')) {
      document.body.style.overflow = '';
    }
  }
}

// ===== SIDEBAR TOGGLE =====
function toggleSidebar() {
  const sidebar = document.getElementById('dashSidebar');
  sidebar.classList.toggle('open');
  if(sidebar.classList.contains('open')) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
}

function closeSidebar() {
  const sidebar = document.getElementById('dashSidebar');
  if(sidebar && sidebar.classList.contains('open')) {
    sidebar.classList.remove('open');
    document.body.style.overflow = '';
  }
}

// ===== GLOBAL EVENT LISTENERS =====
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (activeModalId) {
      // Don't close delete confirmation on ESC to be safe, or allow it?
      // "destructive confirmation should not close accidentally" -> mostly via backdrop click, but ESC is explicit user intent.
      // We will allow ESC to close everything for accessibility.
      closeModal(activeModalId);
    }
    closeSidebar();
  }
});

document.addEventListener('click', (e) => {
  // Backdrop click for modals
  if (e.target.classList.contains('modal-overlay')) {
    // Only close if it's not the delete confirm modal (to prevent accidental destructive closure)
    if (e.target.id !== 'deleteConfirmModal') {
      closeModal(e.target.id);
    }
  }
  
  // Backdrop click for sidebar on mobile
  const sidebar = document.getElementById('dashSidebar');
  const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
  if (sidebar && sidebar.classList.contains('open')) {
    if (!sidebar.contains(e.target) && (!sidebarToggleBtn || !sidebarToggleBtn.contains(e.target))) {
      closeSidebar();
    }
  }
});


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
