/**
 * Priti's Cake - Customer Portal JavaScript (client.js)
 * Manages customer dashboard sections, profile, orders, and cake detail modals.
 */

// Global orders cache for customer
window.customerOrders = [];

// Fallback HTML sanitizer if main.js is not loaded first
function escapeHtml(unsafe) {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Media renderer for customer dashboard with luxurious SVG fallback
function clientCakeMedia(cake) {
  if (cake && cake.image) {
    const src = cake.image.startsWith('http') || cake.image.startsWith('data:')
      ? cake.image
      : `http://localhost:5000${cake.image}`;
    return `<img src="${src}" alt="${escapeHtml(cake.name)}" loading="lazy">`;
  }
  return `
    <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--rose-soft);color:var(--rose-primary);" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" style="width:52px;height:52px;">
        <path d="M12 2a9 9 0 0 1 9 9v1H3v-1a9 9 0 0 1 9-9z"/>
        <path d="M3 12h18v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7z"/>
        <circle cx="12" cy="7" r="1.5"/>
      </svg>
    </div>
  `;
}

// DOM Initialization
document.addEventListener('DOMContentLoaded', () => {
  // Strict auth guard: redirect unauthenticated customers or admin accounts to appropriate login
  if (!isLoggedIn() || isAdmin()) {
    window.location.href = 'login.html';
    return;
  }

  // Pre-fill profile info from cache for instant zero-flicker render
  if (DB.currentUser && DB.currentUser.name) {
    updateUserDisplay(DB.currentUser.name);
  }

  // Load authoritative profile from backend immediately
  loadProfile();

  // Initialize dashboard once cakes are available
  if (isCakesLoaded || cakesError) {
    initDashboard();
  } else {
    window.addEventListener('cakesLoaded', initDashboard);
    window.addEventListener('cakesError', initDashboard);
  }

  // Close modals on Escape key press
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeModal('cakeDetailModal');
      closeModal('orderDetailModal');
      const sidebar = document.getElementById('dashSidebar');
      if (sidebar && sidebar.classList.contains('open')) {
        toggleSidebar();
      }
    }
  });

  // Modal backdrop click to dismiss
  ['cakeDetailModal', 'orderDetailModal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', e => {
        if (e.target === el) closeModal(id);
      });
    }
  });
});

function updateUserDisplay(name) {
  const safeName = escapeHtml(name || 'Customer');
  const initial = safeName.charAt(0).toUpperCase() || 'C';

  const clientNameEl = document.getElementById('clientName');
  const clientInitialEl = document.getElementById('clientInitial');
  const welcomeNameEl = document.getElementById('welcomeUserName');

  if (clientNameEl) clientNameEl.textContent = safeName;
  if (clientInitialEl) clientInitialEl.textContent = initial;
  if (welcomeNameEl) welcomeNameEl.textContent = safeName;
}

function initDashboard() {
  loadClientDashboard();
  showClientSection('overview');
}

// Navigation between dashboard tabs
function showClientSection(id) {
  document.querySelectorAll('.dash-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));

  const sec = document.getElementById('csec-' + id);
  const link = document.getElementById('clink-' + id);
  if (sec) sec.classList.add('active');
  if (link) link.classList.add('active');

  const titles = {
    overview: 'Overview',
    browse: 'Browse Cakes',
    orders: 'My Orders',
    profile: 'My Profile'
  };
  const pageTitle = document.getElementById('pageTitle');
  if (pageTitle) pageTitle.textContent = titles[id] || 'Dashboard';

  // Close mobile sidebar on navigation
  const sidebar = document.getElementById('dashSidebar');
  const backdrop = document.getElementById('dashBackdrop');
  if (sidebar && sidebar.classList.contains('open')) {
    sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('active');
  }

  if (id === 'browse') {
    loadBrowseCakes('All');
    if (typeof updateDashCart === 'function') updateDashCart();
  } else if (id === 'orders') {
    loadClientOrders();
  } else if (id === 'overview') {
    loadClientDashboard();
  } else if (id === 'profile') {
    loadProfile();
  }
}

// OVERVIEW: Statistics, featured cakes preview, and recent orders
async function loadClientDashboard() {
  let myOrders = [];
  try {
    myOrders = await api.get('/orders/myorders');
    window.customerOrders = myOrders;
  } catch (err) {
    console.error('Failed to load dashboard orders:', err);
  }

  // Calculate stats strictly from real data
  const validOrders = myOrders.filter(o => o.status !== 'Cancelled');
  const spent = validOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const activeCount = myOrders.filter(o => ['Pending', 'Confirmed', 'Preparing', 'Out for Delivery'].includes(o.status)).length;

  const countEl = document.getElementById('myOrderCount');
  const spentEl = document.getElementById('mySpent');
  const pendingEl = document.getElementById('myPending');

  if (countEl) countEl.textContent = myOrders.length;
  if (spentEl) spentEl.textContent = `₹${spent.toLocaleString('en-IN')}`;
  if (pendingEl) pendingEl.textContent = activeCount;

  // Recent Orders table (most recent 5)
  const tbody = document.getElementById('clientRecentOrders');
  if (tbody) {
    const recent = [...myOrders].slice(0, 5);
    if (recent.length) {
      tbody.innerHTML = recent.map(o => {
        const orderNum = o._id ? `#${o._id.substring(o._id.length - 6).toUpperCase()}` : '#ORDER';
        const itemsText = o.items ? o.items.map(i => escapeHtml(i.name)).join(', ') : 'Cake selection';
        const totalText = `₹${(o.total || 0).toLocaleString('en-IN')}`;
        const dateText = new Date(o.createdAt || o.date || Date.now()).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
        const statusClass = `badge-${(o.status || 'pending').toLowerCase().replace(/\s+/g, '-')}`;

        return `
          <tr>
            <td><strong>${orderNum}</strong></td>
            <td><div style="max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${itemsText}">${itemsText}</div></td>
            <td><strong>${totalText}</strong></td>
            <td><span class="badge ${statusClass}">${escapeHtml(o.status || 'Pending')}</span></td>
            <td>${dateText}</td>
            <td style="text-align:right">
              <button class="btn btn-outline" style="padding:5px 12px;font-size:0.8rem;border-radius:var(--radius-sm);" onclick="viewOrderDetails('${o._id}')">View Details</button>
            </td>
          </tr>
        `;
      }).join('');
    } else {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center;color:var(--text-muted);padding:40px 20px;">
            <p style="margin-bottom:12px;">You haven't placed any orders yet.</p>
            <button class="btn btn-primary" style="padding:8px 18px;font-size:0.85rem;" onclick="showClientSection('browse')">Browse Cakes</button>
          </td>
        </tr>
      `;
    }
  }

  // Featured Cakes grid
  const featGrid = document.getElementById('featuredCakesGrid');
  if (featGrid) {
    const featured = (DB.cakes || []).slice(0, 4);
    if (featured.length) {
      featGrid.innerHTML = featured.map(cake => `
        <div class="client-cake-card" onclick="openCakeDetail('${cake.id}')" tabindex="0" role="button" aria-label="View details for ${escapeHtml(cake.name)}" onkeypress="if(event.key==='Enter') openCakeDetail('${cake.id}')">
          <div class="client-cake-img">${clientCakeMedia(cake)}</div>
          <div class="client-cake-info">
            <span class="client-cake-category">${escapeHtml(cake.category || 'Specialty')}</span>
            <h4>${escapeHtml(cake.name)}</h4>
            <div class="client-cake-meta">
              <span class="price">₹${Number(cake.price || 0).toLocaleString('en-IN')}</span>
              <span class="rating">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                ${cake.rating || '5.0'}
              </span>
            </div>
            <button class="btn-card-add" onclick="event.stopPropagation(); addToCartClient('${cake.id}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add to Cart
            </button>
          </div>
        </div>
      `).join('');
    } else {
      featGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:30px;color:var(--text-muted);">Artisanal cakes will appear here.</div>';
    }
  }
}

// BROWSE CAKES TAB
function loadBrowseCakes(filter = 'All') {
  const grid = document.getElementById('browseCakesGrid');
  if (!grid) return;

  if (cakesError) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:50px;color:var(--rose-primary);font-weight:600;">Unable to load cakes at this time. Please check your connection and try again.</div>';
    return;
  }

  if (!DB.cakes || DB.cakes.length === 0) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:50px;color:var(--text-muted);">No cakes are available at the moment.</div>';
    return;
  }

  const filtered = filter === 'All'
    ? DB.cakes
    : DB.cakes.filter(c => c.category === filter);

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:50px;color:var(--text-muted);">
        <p>No cakes found in category <strong>${escapeHtml(filter)}</strong>.</p>
        <button class="btn btn-outline" style="margin-top:12px;padding:7px 16px;" onclick="loadBrowseCakes('All')">View All Cakes</button>
      </div>
    `;
  } else {
    grid.innerHTML = filtered.map(cake => `
      <div class="client-cake-card" onclick="openCakeDetail('${cake.id}')" tabindex="0" role="button" aria-label="View details for ${escapeHtml(cake.name)}" onkeypress="if(event.key==='Enter') openCakeDetail('${cake.id}')">
        <div class="client-cake-img">${clientCakeMedia(cake)}</div>
        <div class="client-cake-info">
          <span class="client-cake-category">${escapeHtml(cake.category || 'Cake')}</span>
          <h4>${escapeHtml(cake.name)}</h4>
          <div class="client-cake-meta">
            <span class="price">₹${Number(cake.price || 0).toLocaleString('en-IN')}</span>
            <span class="rating">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              ${cake.rating || '5.0'}
            </span>
          </div>
          <button class="btn-card-add" onclick="event.stopPropagation(); addToCartClient('${cake.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add to Cart
          </button>
        </div>
      </div>
    `).join('');
  }

  // Update active state on filter buttons
  document.querySelectorAll('.cat-filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cat === filter);
  });
}

function addToCartClient(cakeId) {
  addToCart(cakeId, 1);
  if (typeof updateDashCart === 'function') updateDashCart();
}

// CAKE DETAIL MODAL
function openCakeDetail(id) {
  const cake = (DB.cakes || []).find(c => String(c.id) === String(id));
  if (!cake) return;

  const content = document.getElementById('detailContent');
  if (!content) return;

  content.innerHTML = `
    <div style="height:220px;border-radius:var(--radius-md);overflow:hidden;margin-bottom:20px;">
      ${clientCakeMedia(cake)}
    </div>
    <span class="client-cake-category" style="display:inline-block;margin-bottom:6px;">${escapeHtml(cake.category || 'Specialty Cake')}</span>
    <h2 style="font-family:var(--font-serif);font-size:1.75rem;color:var(--text-cocoa);margin-bottom:6px;">${escapeHtml(cake.name)}</h2>
    <div style="font-size:1.6rem;font-weight:800;color:var(--rose-primary);margin-bottom:14px;">₹${Number(cake.price || 0).toLocaleString('en-IN')}</div>
    <p style="color:var(--text-muted);line-height:1.65;font-size:0.95rem;margin-bottom:22px;">${escapeHtml(cake.desc || 'Handcrafted fresh to order with pure ingredients.')}</p>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px;">
      <div style="background:var(--bg-cream);padding:12px 14px;border-radius:var(--radius-sm);border:1px solid var(--border-warm);">
        <span style="font-size:0.75rem;color:var(--text-light);font-weight:700;text-transform:uppercase;">Weight</span>
        <p style="font-weight:700;color:var(--text-cocoa);margin-top:2px;">${escapeHtml(cake.weight || '500g / 1 lb')}</p>
      </div>
      <div style="background:var(--bg-cream);padding:12px 14px;border-radius:var(--radius-sm);border:1px solid var(--border-warm);">
        <span style="font-size:0.75rem;color:var(--text-light);font-weight:700;text-transform:uppercase;">Serves</span>
        <p style="font-weight:700;color:var(--text-cocoa);margin-top:2px;">${escapeHtml(cake.serves || '4-6 portions')}</p>
      </div>
      <div style="background:var(--bg-cream);padding:12px 14px;border-radius:var(--radius-sm);border:1px solid var(--border-warm);">
        <span style="font-size:0.75rem;color:var(--text-light);font-weight:700;text-transform:uppercase;">Prep Time</span>
        <p style="font-weight:700;color:var(--text-cocoa);margin-top:2px;">${escapeHtml(cake.time || '2-4 hours')}</p>
      </div>
      <div style="background:var(--bg-cream);padding:12px 14px;border-radius:var(--radius-sm);border:1px solid var(--border-warm);">
        <span style="font-size:0.75rem;color:var(--text-light);font-weight:700;text-transform:uppercase;">Rating</span>
        <p style="font-weight:700;color:var(--text-cocoa);margin-top:2px;">★ ${cake.rating || '5.0'} (${cake.reviews || 0} reviews)</p>
      </div>
    </div>

    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;padding-top:10px;border-top:1px solid var(--border-warm);">
      <span style="font-weight:700;color:var(--text-cocoa);">Quantity</span>
      <div class="qty-stepper">
        <button type="button" onclick="changeDetailQty(-1)" aria-label="Decrease quantity">−</button>
        <span class="qty-val" id="detailQty">1</span>
        <button type="button" onclick="changeDetailQty(1)" aria-label="Increase quantity">+</button>
      </div>
    </div>

    <button class="btn btn-primary" style="width:100%;padding:13px;font-size:1rem;" onclick="addToCartFromDetail('${cake.id}')">Add to Cart</button>
  `;
  openModal('cakeDetailModal');
}

function changeDetailQty(delta) {
  const el = document.getElementById('detailQty');
  if (!el) return;
  let qty = parseInt(el.textContent, 10) + delta;
  if (qty < 1) qty = 1;
  el.textContent = qty;
}

function addToCartFromDetail(cakeId) {
  const qtyEl = document.getElementById('detailQty');
  const qty = qtyEl ? parseInt(qtyEl.textContent, 10) : 1;
  addToCart(cakeId, qty);
  closeModal('cakeDetailModal');
  if (typeof updateDashCart === 'function') updateDashCart();
}

// MY ORDERS TAB
async function loadClientOrders() {
  const container = document.getElementById('clientOrdersList');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;padding:50px;color:var(--text-muted);">Loading your order history...</div>';

  try {
    const myOrders = await api.get('/orders/myorders');
    window.customerOrders = myOrders;

    if (!myOrders || myOrders.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:60px 20px;background:var(--bg-surface);border:1px solid var(--border-warm);border-radius:var(--radius-md);">
          <div style="width:64px;height:64px;margin:0 auto 16px;border-radius:50%;background:var(--rose-soft);color:var(--rose-primary);display:flex;align-items:center;justify-content:center;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:30px;height:30px;"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          </div>
          <h3 style="font-family:var(--font-serif);font-size:1.3rem;margin-bottom:6px;color:var(--text-cocoa);">No Orders Placed Yet</h3>
          <p style="color:var(--text-muted);font-size:0.92rem;margin-bottom:18px;">When you order cakes, you can track their status and details right here.</p>
          <button class="btn btn-primary" onclick="showClientSection('browse')">Browse Our Cakes</button>
        </div>
      `;
      return;
    }

    container.innerHTML = myOrders.map(o => {
      const orderNum = o._id ? `#${o._id.substring(o._id.length - 6).toUpperCase()}` : '#ORDER';
      const dateText = new Date(o.createdAt || o.date || Date.now()).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
      const itemsList = o.items ? o.items.map(i => `${escapeHtml(i.name)} × ${i.qty}`).join(', ') : 'Cake items';
      const statusClass = `badge-${(o.status || 'pending').toLowerCase().replace(/\s+/g, '-')}`;

      return `
        <div class="order-card">
          <div class="order-card-header">
            <div>
              <span class="order-id-badge">${orderNum}</span>
              <p style="font-size:0.82rem;color:var(--text-muted);margin-top:2px;">Placed on ${dateText}</p>
            </div>
            <span class="badge ${statusClass}">${escapeHtml(o.status || 'Pending')}</span>
          </div>
          <div class="order-card-body">
            <div class="order-items-summary">${itemsList}</div>
            <div class="order-total-price">₹${Number(o.total || 0).toLocaleString('en-IN')}</div>
          </div>
          <div class="order-card-footer">
            <button class="btn btn-outline" style="padding:6px 14px;font-size:0.85rem;" onclick="viewOrderDetails('${o._id}')">View Order Details</button>
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Failed to load orders:', error);
    container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--rose-primary);">Unable to load your orders. Please check your connection and try again.</div>';
    showToast('Unable to load your orders.', 'error');
  }
}

// Status timeline for order details modal
function getStatusTimeline(status) {
  const steps = ['Pending', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered'];
  if (status === 'Cancelled') {
    return `
      <div style="background:#fee2e2;color:#b91c1c;padding:12px;border-radius:var(--radius-sm);font-weight:700;text-align:center;margin-top:14px;">
        Order Cancelled
      </div>
    `;
  }

  const currentIdx = steps.indexOf(status);

  return `
    <div class="order-timeline-wrap">
      ${steps.map((s, i) => {
        const isCompleted = i < currentIdx;
        const isActive = i === currentIdx;
        const cls = isCompleted ? 'completed' : (isActive ? 'active' : '');
        return `
          <div class="order-timeline-step ${cls}">
            <div class="timeline-dot">${i + 1}</div>
            <div class="timeline-label">${escapeHtml(s)}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ORDER DETAILS MODAL
function viewOrderDetails(orderId) {
  const o = (window.customerOrders || []).find(x => String(x._id) === String(orderId));
  if (!o) return showToast('Order not found', 'error');

  const content = document.getElementById('orderDetailContent');
  if (!content) return;

  const deliveryCharge = typeof o.deliveryCharge === 'number' ? o.deliveryCharge : 50;
  const subtotal = (o.total || 0) - deliveryCharge;
  const orderNum = `#${o._id.substring(o._id.length - 6).toUpperCase()}`;
  const placedDate = new Date(o.createdAt || o.date || Date.now());
  const statusClass = `badge-${(o.status || 'pending').toLowerCase().replace(/\s+/g, '-')}`;

  content.innerHTML = `
    <div style="border-bottom:1px solid var(--border-warm);padding-bottom:18px;margin-bottom:18px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
        <div>
          <h2 style="font-family:var(--font-serif);font-size:1.5rem;color:var(--text-cocoa);margin-bottom:2px;">Order Summary</h2>
          <p style="font-size:0.85rem;color:var(--text-muted);font-family:monospace;font-weight:700;">${orderNum}</p>
        </div>
        <span class="badge ${statusClass}">${escapeHtml(o.status || 'Pending')}</span>
      </div>
      <p style="color:var(--text-muted);font-size:0.85rem;">
        Placed on ${placedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at ${placedDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>

    <div style="margin-bottom:22px;">
      <h4 style="font-size:0.9rem;font-weight:700;color:var(--text-cocoa);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">Order Progress</h4>
      ${getStatusTimeline(o.status)}
    </div>

    <h4 style="font-size:0.9rem;font-weight:700;color:var(--text-cocoa);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">Ordered Items</h4>
    <div style="background:var(--bg-cream);border:1px solid var(--border-warm);border-radius:var(--radius-sm);padding:14px;margin-bottom:20px;">
      ${(o.items || []).map(i => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(56,40,37,0.06);font-size:0.92rem;">
          <div>
            <strong style="color:var(--text-cocoa);">${escapeHtml(i.name)}</strong>
            <span style="color:var(--text-muted);margin-left:8px;">× ${i.qty}</span>
          </div>
          <span style="font-weight:700;color:var(--text-cocoa);">₹${Number(i.price * i.qty).toLocaleString('en-IN')}</span>
        </div>
      `).join('')}

      <div style="padding-top:12px;margin-top:4px;">
        <div style="display:flex;justify-content:space-between;font-size:0.88rem;color:var(--text-muted);margin-bottom:6px;">
          <span>Items Subtotal</span>
          <span>₹${Number(subtotal).toLocaleString('en-IN')}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:0.88rem;color:var(--text-muted);margin-bottom:8px;">
          <span>Delivery Charge</span>
          <span>₹${Number(deliveryCharge).toLocaleString('en-IN')}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:1.15rem;font-weight:800;color:var(--rose-primary);border-top:1px solid var(--border-warm);padding-top:10px;">
          <span>Total Amount</span>
          <span>₹${Number(o.total || 0).toLocaleString('en-IN')}</span>
        </div>
      </div>
    </div>

    <h4 style="font-size:0.9rem;font-weight:700;color:var(--text-cocoa);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">Delivery Coordination</h4>
    <div style="background:var(--bg-surface);border:1px solid var(--border-warm);border-radius:var(--radius-sm);padding:14px;font-size:0.88rem;color:var(--text-cocoa);">
      <p style="margin-bottom:6px;"><strong>Recipient Contact:</strong> ${escapeHtml(o.phone || 'N/A')}</p>
      <p style="margin-bottom:6px;"><strong>Delivery Destination:</strong><br>${escapeHtml(o.deliveryAddress || 'N/A')}</p>
      ${o.deliveryDate ? `<p style="margin-bottom:6px;"><strong>Scheduled Date:</strong> ${escapeHtml(o.deliveryDate)}</p>` : ''}
      ${o.deliveryTimeSlot ? `<p style="margin-bottom:6px;"><strong>Time Window:</strong> ${escapeHtml(o.deliveryTimeSlot)}</p>` : ''}
      ${o.cakeMessage ? `<p style="margin-bottom:6px;"><strong>Cake Inscription:</strong> "${escapeHtml(o.cakeMessage)}"</p>` : ''}
      ${o.specialInstructions ? `<p style="margin:0;"><strong>Special Notes:</strong><br>${escapeHtml(o.specialInstructions)}</p>` : ''}
    </div>
  `;
  openModal('orderDetailModal');
}

// PROFILE TAB
async function loadProfile() {
  const nameEl = document.getElementById('profileName');
  const emailEl = document.getElementById('profileEmail');
  const initEl = document.getElementById('profileInitial');
  const editName = document.getElementById('editName');
  const editEmail = document.getElementById('editEmail');
  const editPhone = document.getElementById('editPhone');

  try {
    const response = await api.get('/auth/profile');
    const profile = response.data || response;

    DB.currentUser = { ...DB.currentUser, ...profile };
    localStorage.setItem('pc_current_user', JSON.stringify(DB.currentUser));

    updateUserDisplay(profile.name);

    if (nameEl) nameEl.textContent = profile.name || 'Customer';
    if (emailEl) emailEl.textContent = profile.email || '';
    if (initEl && profile.name) initEl.textContent = profile.name.charAt(0).toUpperCase();

    if (editName) editName.value = profile.name || '';
    if (editEmail) editEmail.value = profile.email || '';
    if (editPhone) editPhone.value = profile.phone || '';
  } catch (error) {
    console.error('Failed to load profile:', error);
    if (nameEl) nameEl.textContent = 'Account Profile';
    showToast(error.message || 'Unable to refresh profile data', 'error');
  }
}

async function saveProfile() {
  const nameInput = document.getElementById('editName');
  const phoneInput = document.getElementById('editPhone');
  const passwordInput = document.getElementById('editPassword');

  const name = nameInput ? nameInput.value.trim() : '';
  const phone = phoneInput ? phoneInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';

  if (!name) {
    showToast('Name is required', 'error');
    if (nameInput) nameInput.focus();
    return;
  }

  const btn = document.getElementById('saveProfileBtn');
  const originalHtml = btn ? btn.innerHTML : '';
  if (btn) {
    btn.innerHTML = 'Saving Changes...';
    btn.disabled = true;
  }

  try {
    const payload = { name, phone };
    if (password) payload.password = password;

    const response = await api.put('/auth/profile', payload);
    const updatedUser = response.data || response;

    DB.currentUser = { ...DB.currentUser, ...updatedUser };
    localStorage.setItem('pc_current_user', JSON.stringify(DB.currentUser));

    updateUserDisplay(updatedUser.name);
    await loadProfile();

    if (passwordInput) passwordInput.value = '';
    showToast('Profile updated successfully!', 'success');
  } catch (error) {
    console.error('Failed to update profile:', error);
    showToast(error.message || 'Failed to update profile', 'error');
  } finally {
    if (btn) {
      btn.innerHTML = originalHtml;
      btn.disabled = false;
    }
  }
}

function cancelProfileEdit() {
  loadProfile();
  showToast('Changes reverted.', 'info');
}

// Modal and Sidebar helper toggles
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('active');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('active');
}

function toggleSidebar() {
  const sidebar = document.getElementById('dashSidebar');
  const backdrop = document.getElementById('dashBackdrop');
  if (sidebar) {
    sidebar.classList.toggle('open');
    if (backdrop) {
      backdrop.classList.toggle('active', sidebar.classList.contains('open'));
    }
  }
}
