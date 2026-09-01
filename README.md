# Priti's Cake 🎂

A fully responsive, front-end bakery e-commerce website for "Priti's Cake" — a custom cake shop. Browse cakes by category, add them to a cart, place orders, and manage everything through customer and admin dashboards. Built with plain HTML, CSS, and JavaScript, with data persisted in the browser via `localStorage` (no backend required).

## ✨ Features

### Storefront
- **Home** (`index.html`) — hero, shop-by-category, bestsellers, how-it-works, stats, testimonials.
- **Catalog** (`catalog.html`) — filter by category, price range, and rating; sort by price/rating/popularity; cake detail modal with quantity selector.
- **Gallery** (`gallery.html`) — filterable showcase with lightbox preview.
- **About** (`about.html`) — brand story, team, and reasons to choose.
- **Contact** (`contact.html`) — contact info, message form, FAQ accordion.

### Authentication
- **Login / Register** (`login.html`) — tabbed auth flow.
- Admin: `admin@priticake.com` / `admin123`
- Customers register in-browser; sessions stored in `localStorage`.

### Customer Dashboard (`client-dashboard.html`)
- Overview stats (orders, spend, active orders).
- Browse cakes by category and add to cart.
- Track orders with a status timeline (Pending → Confirmed → Baking → Delivered).
- Editable profile.

### Admin Dashboard (`admin-dashboard.html`)
- Sales overview with stats, weekly chart, and top categories.
- Manage cakes (add / edit / delete).
- Manage orders (update status, view details).
- View registered customers and their spend.
- Shop settings panel.

## 🛠️ Tech Stack
- HTML5, CSS3 (custom, no framework)
- Vanilla JavaScript (ES6)
- `localStorage` for persistence (users, orders, cart, cakes)

## 📁 Project Structure
```
Priti's Cake/
├── index.html              # Home
├── catalog.html            # Cake catalog with filters
├── gallery.html            # Image/showcase gallery
├── about.html              # About us
├── contact.html            # Contact + FAQ
├── login.html              # Login / Register
├── admin-dashboard.html    # Admin panel
├── client-dashboard.html   # Customer panel
├── css/
│   ├── style.css           # Storefront styles
│   └── dashboard.css       # Dashboard styles
└── js/
    ├── main.js             # Shared data store, auth, cart, orders
    ├── admin.js            # Admin dashboard logic
    └── client.js           # Customer dashboard logic
```

## 🚀 Getting Started
No build step or dependencies required — just open the site.

1. Clone or download the project.
2. Open `index.html` in a browser (or use a simple static server):
   ```bash
   # Optional: serve with Python
   python -m http.server 8000
   ```
3. Visit `http://localhost:8000`.

### Demo Accounts
- **Admin:** `admin@priticake.com` / `admin123`
- **Customer:** Register a new account via the login page.

## 📝 Notes & Limitations
- All data lives in the browser's `localStorage`, so it is **per-device and resets when storage is cleared**. There is no shared backend yet.
- Images are represented with emoji/gradient placeholders — swap in real product photos for production.
- Known issue: the admin "Add New Cake" modal references a missing form id; wrap the reset in a null check or add `id="cakeForm"` to fix.

## 🔮 Possible Next Steps
- Add a real backend (Node/Express + database, or Firebase) for shared, persistent data.
- Integrate payments (UPI / cards) and order notifications (email/SMS).
- Replace placeholders with real imagery and add a product image uploader in admin.
- Implement search, password recovery, and improved mobile navigation.
