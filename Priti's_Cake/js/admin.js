function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
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
    orders: 'Manage Orders', customers: 'Customers', settings: 'Settings',
    messages: 'Contact Messages'
  }[id] || 'Dashboard';

  try {
    if (id === 'cakes') await loadCakes();
    if (id === 'orders') await loadOrders();
    if (id === 'customers') await loadCustomers();
    if (id === 'dashboard') {
      await loadDashboard();
      updateUnreadBadge();
    }
    if (id === 'settings') await loadSettings();
    if (id === 'messages') await loadMessages();
  } catch(err) {
    showToast(err.message || 'Error loading section', 'error');
  }
}

function updateRevenueFilterUI() {
  const period = document.getElementById('revPeriod').value;
  document.getElementById('revDateContainer').style.display = period === 'daily' ? 'block' : 'none';
  document.getElementById('revMonthContainer').style.display = period === 'monthly' ? 'flex' : 'none';
  document.getElementById('revYearContainer').style.display = period === 'yearly' ? 'block' : 'none';
}

async function fetchFilteredRevenue() {
  const period = document.getElementById('revPeriod').value;
  let url = '/admin/revenue?period=' + period;
  let label = '';

  if (period === 'daily') {
    const date = document.getElementById('revDate').value;
    if (!date) return typeof showToast === 'function' ? showToast('Please select a date', 'error') : alert('Please select a date');
    url += '&date=' + date;
    label = 'Revenue for ' + new Date(date).toLocaleDateString();
  } else if (period === 'monthly') {
    const month = document.getElementById('revMonth').value;
    const year = document.getElementById('revMonthYear').value;
    if (!year) return typeof showToast === 'function' ? showToast('Please enter a year', 'error') : alert('Please enter a year');
    url += '&month=' + month + '&year=' + year;
    label = 'Revenue for ' + document.getElementById('revMonth').options[month-1].text + ' ' + year;
  } else if (period === 'yearly') {
    const year = document.getElementById('revYear').value;
    if (!year) return typeof showToast === 'function' ? showToast('Please enter a year', 'error') : alert('Please enter a year');
    url += '&year=' + year;
    label = 'Revenue for ' + year;
  }

  const resEl = document.getElementById('filteredRevenueResult');
  const labelEl = document.getElementById('filteredRevenueLabel');

  resEl.textContent = '...';
  labelEl.textContent = 'Loading...';

  try {
    const data = await api.get(url);
    resEl.textContent = typeof formatCurrency === 'function' ? formatCurrency(data.revenue) : '₹' + data.revenue.toLocaleString();
    labelEl.textContent = label;
  } catch (err) {
    console.error(err);
    resEl.textContent = 'Error';
    labelEl.textContent = err.message || 'Failed to fetch revenue';
    if(typeof showToast === 'function') showToast(err.message || 'Failed to fetch revenue', 'error');
  }
}

async function loadDashboard() {
  // Reset values to a loading state
  document.getElementById('totalOrders').textContent = '...';
  document.getElementById('totalRevenue').textContent = '...';
  document.getElementById('totalCakes').textContent = '...';
  document.getElementById('totalCustomers').textContent = '...';
  
  const tbody = document.getElementById('recentOrdersBody');
  tbody.innerHTML = '<tr><td colspan="6" class="state-loading">Loading recent orders...</td></tr>';

  try {
    const [stats, orders, cakes] = await Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/orders'),
      api.get('/admin/cakes')
    ]);
    
    const revenue = orders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + o.total, 0);
    document.getElementById('totalOrders').textContent = orders.length;
    document.getElementById('totalRevenue').textContent = typeof formatCurrency === 'function' ? formatCurrency(revenue) : '' + revenue.toLocaleString();
    document.getElementById('totalCakes').textContent = cakes.length;
    document.getElementById('totalCustomers').textContent = stats.totalCustomers;

    // Recent orders
    const recent = orders.slice(0, 5);
    tbody.innerHTML = recent.length ? recent.map(o => `
      <tr>
        <td class="col-id"><strong>${o._id.substring(o._id.length-6).toUpperCase()}</strong></td>
        <td>${escapeHtml(o.userName)}</td>
        <td>${o.items.map(i => i.name).join(', ')}</td>
        <td class="col-amount" style="text-align:right">${typeof formatCurrency === 'function' ? formatCurrency(o.total) : o.total}</td>
        <td><span class="badge badge-${o.status.toLowerCase().replace(/\s+/g, '-')}">${o.status}</span></td>
        <td>${new Date(o.createdAt).toLocaleDateString()}</td>
      </tr>
    `).join('') : '<tr><td colspan="6" class="empty-state">No recent orders found.</td></tr>';

  } catch(err) {
    console.error(err);
    document.getElementById('totalOrders').textContent = '-';
    document.getElementById('totalRevenue').textContent = '-';
    document.getElementById('totalCakes').textContent = '-';
    document.getElementById('totalCustomers').textContent = '-';
    tbody.innerHTML = '<tr><td colspan="6" class="state-error" style="text-align:center">Unable to load dashboard data.<br><button class="btn btn-outline" style="margin-top:10px;padding:6px 12px;font-size:0.8rem" onclick="loadDashboard()">Retry</button></td></tr>';
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
let allOrders = [];
let allCustomers = [];
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
          <div style="font-weight:600;color:#111827">${escapeHtml(o.userName)}</div>
          <div style="font-size:0.8125rem;color:#6b7280">${escapeHtml(o.userEmail)}</div>
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
          <div style="font-weight:600;color:#111827">${escapeHtml(o.userName)}</div>
          <div style="font-size:0.875rem;color:#4b5563">${escapeHtml(o.userEmail)}</div>
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
let isProcessingCustomerBlock = false;

async function loadCustomers() {
  const tbody = document.getElementById('customersBody');
  tbody.innerHTML = '<tr><td colspan="6" class="state-loading" style="padding:30px">Loading customers...</td></tr>';
  
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
    console.error('Failed to load customers:', err);
    tbody.innerHTML = '<tr><td colspan="6" class="state-error" style="padding:30px">Unable to load customers. Please try again.</td></tr>';
  }
}

function renderCustomers(customersToRender) {
  const tbody = document.getElementById('customersBody');
  if (!customersToRender || customersToRender.length === 0) {
    const isFiltered = document.getElementById('searchCustomersInput').value;
    const msg = isFiltered ? 'No customers match your search.' : 'No customers found.';
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state" style="padding:30px">${msg}</td></tr>`;
    return;
  }
  
  tbody.innerHTML = customersToRender.map(c => {
    const date = new Date(c.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    const initial = c.name ? c.name[0].toUpperCase() : '?';
    const total = typeof formatCurrency === 'function' ? formatCurrency(c.totalSpent) : c.totalSpent;
    
    return `
      <tr id="row-customer-${c._id}">
        <td style="padding:12px">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:36px;height:36px;background:#fdf2f8;border:1px solid #fbcfe8;color:#be185d;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:0.875rem;flex-shrink:0">${initial}</div>
            <div>
              <div style="font-weight:600;color:#111827">${escapeHtml(c.name)}</div>
              <div style="font-size:0.8125rem;color:#6b7280">${escapeHtml(c.email)}</div>
              ${c.phone ? `<div style="font-size:0.8125rem;color:#6b7280">${escapeHtml(c.phone)}</div>` : ''}
            </div>
          </div>
        </td>
        <td style="padding:12px;font-size:0.875rem;color:#4b5563">${date}</td>
        <td style="padding:12px;text-align:right;font-size:0.875rem;font-weight:500;color:#111827">${c.orderCount}</td>
        <td style="padding:12px;text-align:right;font-weight:600;color:#111827">${total}</td>
        <td style="padding:12px;text-align:center" id="cell-status-${c._id}">
          <span class="badge ${Boolean(c.isBlocked) ? 'badge-blocked' : 'badge-active'}" id="badge-cust-${c._id}">${Boolean(c.isBlocked) ? 'Blocked' : 'Active'}</span>
        </td>
        <td style="padding:12px;text-align:right">
          <div style="display:flex;gap:8px;justify-content:flex-end;align-items:center">
            <button type="button" class="btn-sm btn-outline" style="border:1px solid #d1d5db;color:#374151;background:#fff" onclick="event.preventDefault(); viewCustomer('${c._id}')">View Details</button>
            <button type="button" class="btn-sm ${Boolean(c.isBlocked) ? 'btn-unblock' : 'btn-block'}" id="btn-block-${c._id}" data-customer-id="${c._id}" onclick="event.preventDefault(); toggleBlockCustomer('${c._id}', this)">${Boolean(c.isBlocked) ? 'Unblock' : 'Block'}</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function updateCustomerRowUI(customer) {
  const isBlocked = Boolean(customer.isBlocked);

  // Update status badge
  const badge = document.getElementById(`badge-cust-${customer._id}`);
  if (badge) {
    badge.className = `badge ${isBlocked ? 'badge-blocked' : 'badge-active'}`;
    badge.textContent = isBlocked ? 'Blocked' : 'Active';
  }

  // Update action button
  const btn = document.getElementById(`btn-block-${customer._id}`);
  if (btn) {
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.className = `btn-sm ${isBlocked ? 'btn-unblock' : 'btn-block'}`;
    btn.textContent = isBlocked ? 'Unblock' : 'Block';
  }
}

async function toggleBlockCustomer(customerId, btnEl) {
  if (isProcessingCustomerBlock) return;

  const customer = allCustomers.find(c => c._id === customerId);
  if (!customer) return;

  const currentAdmin = JSON.parse(localStorage.getItem('pc_admin') || 'null');
  if (currentAdmin && (currentAdmin.id === customerId || currentAdmin._id === customerId)) {
    showToast('Administrators cannot block their own account', 'error');
    return;
  }

  const isBlocked = Boolean(customer.isBlocked);
  const actionText = isBlocked ? 'unblock' : 'block';
  const customerName = customer.name || 'this customer';
  const customerEmail = customer.email ? ` (${customer.email})` : '';

  const confirmMsg = isBlocked
    ? `Are you sure you want to unblock customer "${customerName}"${customerEmail}?`
    : `Are you sure you want to block customer "${customerName}"${customerEmail}?\n\nThey will no longer be able to log in or access protected customer features.`;

  if (!window.confirm(confirmMsg)) {
    return;
  }

  const btn = btnEl || document.getElementById(`btn-block-${customerId}`);
  const originalText = btn ? btn.textContent : (isBlocked ? 'Unblock' : 'Block');

  if (btn) {
    btn.disabled = true;
    btn.textContent = isBlocked ? 'Unblocking...' : 'Blocking...';
    btn.style.opacity = '0.6';
  }

  isProcessingCustomerBlock = true;

  try {
    const res = await api.patch(`/admin/customers/${customerId}/${actionText}`);

    // Update customer in local memory
    customer.isBlocked = !isBlocked;

    // Update row elements in place without reloading entire page
    updateCustomerRowUI(customer);

    showToast(res.message || `Customer ${isBlocked ? 'unblocked' : 'blocked'} successfully`, 'success');
  } catch (err) {
    console.error(`Failed to ${actionText} customer:`, err);
    showToast(err.message || `Failed to ${actionText} customer`, 'error');
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalText;
      btn.style.opacity = '1';
    }
  } finally {
    isProcessingCustomerBlock = false;
  }
}

function blockCustomer(customerId, btnEl) {
  const customer = allCustomers.find(c => c._id === customerId);
  if (customer && customer.isBlocked) return;
  return toggleBlockCustomer(customerId, btnEl);
}

function unblockCustomer(customerId, btnEl) {
  const customer = allCustomers.find(c => c._id === customerId);
  if (customer && !customer.isBlocked) return;
  return toggleBlockCustomer(customerId, btnEl);
}

window.toggleBlockCustomer = toggleBlockCustomer;
window.blockCustomer = blockCustomer;
window.unblockCustomer = unblockCustomer;

function filterCustomers() {
  const query = (document.getElementById('searchCustomersInput').value || '').toLowerCase().trim();
  
  if (!query) {
    renderCustomers(allCustomers);
    return;
  }
  
  const filtered = allCustomers.filter(c => {
    return (c.name && c.name.toLowerCase().includes(query)) || 
           (c.email && c.email.toLowerCase().includes(query)) ||
           (c.phone && c.phone.toLowerCase().includes(query)) ||
           (c.isBlocked ? 'blocked' : 'active').includes(query);
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
          <div style="font-weight:600;color:#111827;font-size:1.125rem">${escapeHtml(c.name)}</div>
          <div style="font-size:0.875rem;color:#4b5563;margin-top:2px">${escapeHtml(c.email)}</div>
          ${c.phone ? `<div style="font-size:0.875rem;color:#4b5563;margin-top:2px">${escapeHtml(c.phone)}</div>` : ''}
          <div style="font-size:0.875rem;color:#6b7280;margin-top:6px">Joined: ${dateStr}</div>
          <div style="font-size:0.875rem;color:#4b5563;margin-top:6px;display:flex;align-items:center;gap:6px">
            <span>Status:</span>
            <span class="badge ${Boolean(c.isBlocked) ? 'badge-blocked' : 'badge-active'}" id="modal-status-badge-${c._id}">${Boolean(c.isBlocked) ? 'Blocked' : 'Active'}</span>
          </div>
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

// ===== CONTACT MESSAGES =====
let allMessages = [];

async function updateUnreadBadge() {
  try {
    const messages = await api.get('/admin/contact-messages');
    if (Array.isArray(messages)) {
      if (allMessages.length === 0) allMessages = messages;
      const unreadCount = messages.filter(m => m.status === 'unread').length;
      const badge = document.getElementById('unreadBadgeNav');
      if (badge) {
        if (unreadCount > 0) {
          badge.textContent = unreadCount;
          badge.style.display = 'inline-block';
        } else {
          badge.style.display = 'none';
        }
      }
    }
  } catch (err) {
    // Non-blocking background fetch
  }
}

async function loadMessages() {
  const tbody = document.getElementById('messagesBody');
  if (tbody && (!allMessages || allMessages.length === 0)) {
    tbody.innerHTML = '<tr><td colspan="6" class="state-loading" style="padding:30px">Loading messages...</td></tr>';
  }

  try {
    const messages = await api.get('/admin/contact-messages');
    allMessages = Array.isArray(messages) ? messages : [];
    updateMessageStats();
    filterMessages();
  } catch (err) {
    console.error('Failed to load messages:', err);
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="6" class="state-error" style="text-align:center">Unable to load contact messages.<br><button type="button" class="btn btn-outline" style="margin-top:10px;padding:6px 12px;font-size:0.8rem" onclick="event.preventDefault(); loadMessages()">Retry</button></td></tr>`;
    }
    showToast(err.message || 'Failed to load messages', 'error');
  }
}

function updateMessageStats() {
  const total = allMessages.length;
  const unread = allMessages.filter(m => m.status === 'unread').length;
  const read = allMessages.filter(m => m.status === 'read').length;
  const archived = allMessages.filter(m => m.status === 'archived').length;

  const totalEl = document.getElementById('totalMessagesCount');
  const unreadEl = document.getElementById('unreadMessagesCount');
  const readEl = document.getElementById('readMessagesCount');
  const archivedEl = document.getElementById('archivedMessagesCount');
  const badgeEl = document.getElementById('unreadBadgeNav');

  if (totalEl) totalEl.textContent = total;
  if (unreadEl) unreadEl.textContent = unread;
  if (readEl) readEl.textContent = read;
  if (archivedEl) archivedEl.textContent = archived;

  if (badgeEl) {
    if (unread > 0) {
      badgeEl.textContent = unread;
      badgeEl.style.display = 'inline-block';
    } else {
      badgeEl.style.display = 'none';
    }
  }
}

function filterMessages() {
  const searchInput = document.getElementById('searchMessagesInput');
  const statusFilter = document.getElementById('filterMessagesStatus');
  const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
  const status = statusFilter ? statusFilter.value : 'all';

  const filtered = allMessages.filter(m => {
    const matchesStatus = (status === 'all') || (m.status === status);
    const matchesQuery = !query ||
      (m.name && m.name.toLowerCase().includes(query)) ||
      (m.email && m.email.toLowerCase().includes(query)) ||
      (m.subject && m.subject.toLowerCase().includes(query)) ||
      (m.message && m.message.toLowerCase().includes(query)) ||
      (m.phone && m.phone.toLowerCase().includes(query));
    return matchesStatus && matchesQuery;
  });

  renderMessages(filtered);
}

function resetMessageFilters() {
  const searchInput = document.getElementById('searchMessagesInput');
  const statusFilter = document.getElementById('filterMessagesStatus');
  if (searchInput) searchInput.value = '';
  if (statusFilter) statusFilter.value = 'all';
  filterMessages();
}

function renderMessages(messages) {
  const tbody = document.getElementById('messagesBody');
  if (!tbody) return;

  if (!messages || messages.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No contact messages found.</td></tr>';
    return;
  }

  tbody.innerHTML = messages.map(m => {
    const dateStr = new Date(m.createdAt).toLocaleDateString();
    const cleanName = escapeHtml(m.name);
    const cleanEmail = escapeHtml(m.email);
    const safeMailto = 'mailto:' + encodeURIComponent(m.email);
    const phoneHtml = m.phone ? `<br><small style="color:#6b7280">${escapeHtml(m.phone)}</small>` : '';
    const cleanSubject = escapeHtml(m.subject);
    const previewText = escapeHtml(m.message.length > 50 ? m.message.substring(0, 50) + '...' : m.message);
    const statusClass = `badge-${m.status}`;

    let actions = `<button class="btn btn-sm btn-outline" type="button" onclick="event.preventDefault(); viewMessage('${m._id}')" title="View details" style="padding:4px 8px;font-size:0.75rem">View</button>`;

    if (m.status === 'unread') {
      actions += ` <button class="btn btn-sm" type="button" onclick="event.preventDefault(); markMessageStatus('${m._id}', 'read')" title="Mark as read" style="padding:4px 8px;font-size:0.75rem;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe">Read</button>`;
    }
    if (m.status !== 'archived') {
      actions += ` <button class="btn btn-sm" type="button" onclick="event.preventDefault(); markMessageStatus('${m._id}', 'archived')" title="Archive inquiry" style="padding:4px 8px;font-size:0.75rem;background:#f3f4f6;color:#4b5563;border:1px solid #e5e7eb">Archive</button>`;
    }

    return `
      <tr id="msg-row-${m._id}">
        <td style="padding:12px;font-size:0.875rem;white-space:nowrap">${dateStr}</td>
        <td style="padding:12px;font-size:0.875rem">
          <strong>${cleanName}</strong><br>
          <a href="${safeMailto}" style="color:#e91e63;text-decoration:none;font-size:0.8125rem">${cleanEmail}</a>
          ${phoneHtml}
        </td>
        <td style="padding:12px;font-size:0.875rem;font-weight:500">${cleanSubject}</td>
        <td style="padding:12px;font-size:0.875rem" title="${escapeHtml(m.message)}">
          <div class="msg-preview">${previewText}</div>
        </td>
        <td style="text-align:center;padding:12px"><span class="badge ${statusClass}">${escapeHtml(m.status)}</span></td>
        <td style="text-align:right;padding:12px;white-space:nowrap">${actions}</td>
      </tr>
    `;
  }).join('');
}

function viewMessage(id) {
  const m = allMessages.find(item => item._id === id);
  if (!m) {
    showToast('Message not found', 'error');
    return;
  }

  const content = document.getElementById('messageDetailContent');
  const footer = document.getElementById('messageDetailFooter');
  if (!content || !footer) return;

  const createdDate = new Date(m.createdAt).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
  const safeMailto = 'mailto:' + encodeURIComponent(m.email);
  const cleanPhone = m.phone ? m.phone.replace(/[^0-9+\-\s()]/g, '') : '';
  const safeTel = cleanPhone ? 'tel:' + encodeURIComponent(cleanPhone) : '';

  content.innerHTML = `
    <div class="msg-detail-grid">
      <div>
        <div class="msg-detail-label">Customer</div>
        <div class="msg-detail-value">${escapeHtml(m.name)}</div>
      </div>
      <div>
        <div class="msg-detail-label">Email</div>
        <div class="msg-detail-value">
          <a href="${safeMailto}" style="color:#e91e63;text-decoration:none">${escapeHtml(m.email)}</a>
        </div>
      </div>
      <div>
        <div class="msg-detail-label">Phone</div>
        <div class="msg-detail-value">
          ${m.phone ? `<a href="${safeTel}" style="color:#e91e63;text-decoration:none">${escapeHtml(m.phone)}</a>` : '<span style="color:#9ca3af">Not provided</span>'}
        </div>
      </div>
      <div>
        <div class="msg-detail-label">Submitted On</div>
        <div class="msg-detail-value">${createdDate}</div>
      </div>
      <div>
        <div class="msg-detail-label">Status</div>
        <div class="msg-detail-value">
          <span class="badge badge-${m.status}">${escapeHtml(m.status)}</span>
        </div>
      </div>
      <div>
        <div class="msg-detail-label">Subject</div>
        <div class="msg-detail-value">${escapeHtml(m.subject)}</div>
      </div>
    </div>
    <div>
      <div class="msg-detail-label" style="margin-bottom:8px">Message Content</div>
      <div class="msg-body-box">${escapeHtml(m.message)}</div>
    </div>
  `;

  let footerButtons = '';
  if (m.status === 'unread') {
    footerButtons += `<button class="btn" type="button" onclick="event.preventDefault(); markMessageStatus('${m._id}', 'read')" style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;padding:10px 20px">Mark as Read</button>`;
  }
  if (m.status !== 'archived') {
    footerButtons += `<button class="btn btn-outline" type="button" onclick="event.preventDefault(); markMessageStatus('${m._id}', 'archived')" style="padding:10px 20px">Archive</button>`;
  }
  footerButtons += `<button class="btn btn-outline" style="padding:10px 20px;border:1px solid #d1d5db;color:#374151;background:#fff" type="button" onclick="event.preventDefault(); closeModal('messageDetailModal')">Close</button>`;

  footer.innerHTML = footerButtons;
  openModal('messageDetailModal');
}

async function markMessageStatus(id, newStatus) {
  try {
    await api.patch('/admin/contact-messages/' + id, { status: newStatus });
    const target = allMessages.find(m => m._id === id);
    if (target) {
      target.status = newStatus;
    }
    updateMessageStats();
    filterMessages();

    // If detail modal is open for this message, re-render it
    if (activeModalId === 'messageDetailModal' && target) {
      viewMessage(id);
    }

    showToast(`Message marked as ${newStatus}`, 'success');
  } catch (err) {
    console.error('Failed to update message status:', err);
    showToast(err.message || 'Failed to update message status', 'error');
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
