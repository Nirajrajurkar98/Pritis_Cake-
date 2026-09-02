# Priti's Cake 🎂

A fully responsive, client-side bakery e-commerce application designed for "Priti's Cake" — a custom cake shop. The application provides a complete storefront experience, customer management, and an administration dashboard. It is built entirely with plain HTML, CSS, and Vanilla JavaScript (ES6). To simulate a full-stack experience without a backend, it leverages the browser's `localStorage` for data persistence.

## ✨ Features

### Storefront & Shopping Experience
- **Home** (`index.html`): Engaging landing page featuring hero sections, shop-by-category, bestsellers, statistics, and testimonials.
- **Catalog** (`catalog.html`): A dynamic cake catalog with advanced filtering (by category, price range, rating) and sorting capabilities. Includes a detailed cake modal for adding items to the cart with quantity selection.
- **Gallery** (`gallery.html`): A filterable image showcase with a lightbox preview feature for high-quality visuals.
- **Information Pages**: `about.html` (brand story, team) and `contact.html` (contact info, messaging form, FAQs).
- **Shopping Cart**: Real-time cart management accessible from anywhere, with automatic subtotal and delivery cost calculations.

### Authentication & Authorization
- **Login / Register** (`login.html`): Tabbed interface for user authentication.
- **Role-Based Access**: Distinguishes between customers and administrators.
- **Demo Credentials**: 
  - Admin: `admin@priticake.com` / `admin123`
  - Client: Register a new account locally via the UI.

### Dashboards
- **Customer Dashboard** (`client-dashboard.html`): 
  - Overview of past orders, total spend, and active orders.
  - Interactive status timeline for order tracking (Pending → Confirmed → Baking → Delivered).
  - Profile management and quick re-ordering.
- **Admin Dashboard** (`admin-dashboard.html`): 
  - **Analytics**: Sales overview, total revenue, weekly chart visualization, and top category metrics.
  - **Cake Management**: Complete CRUD operations for the cake catalog. Upload product images (automatically resized via Canvas API to a max dimension of 800px).
  - **Order Management**: Review customer orders and update fulfillment statuses.
  - **Customer Insights**: View registered users and their lifetime spend.

## 🛠️ Technical Architecture

- **Frontend**: HTML5, CSS3 (Custom styling, flexbox/grid layouts, no external CSS frameworks)
- **Logic**: Vanilla JavaScript (ES6)
- **State Management & Database**: The state is stored in an in-memory `DB` object and continuously synced to `localStorage`.
  - Keys used: `pc_users`, `pc_orders`, `pc_cart`, `pc_current_user`, `pc_cakes`.
- **Media**: Client-side image compression using `FileReader` and `Canvas` API (`canvas.toDataURL('image/jpeg', 0.8)`). Fallback to emojis if no images are provided.
- **Responsive Design**: Mobile-first media queries and a custom hamburger menu for navigation.

## 📁 Project Structure

```text
Priti's Cake/
├── index.html              # Home
├── catalog.html            # Cake catalog with filters & sorting
├── gallery.html            # Image/showcase gallery
├── about.html              # About us
├── contact.html            # Contact + FAQ
├── login.html              # Login / Register
├── admin-dashboard.html    # Admin panel
├── client-dashboard.html   # Customer panel
├── css/
│   ├── style.css           # Global storefront styles
│   └── dashboard.css       # Admin/Client dashboard specific styles
└── js/
    ├── main.js             # Core DB logic, auth, cart, & shared state
    ├── admin.js            # Admin dashboard functionality (CRUD, Charts)
    └── client.js           # Customer dashboard functionality
```

## 🚀 Getting Started

Since this is a client-side only application, there are no build steps, package managers, or server dependencies required.

1. **Clone or Download** the repository.
2. **Serve the files**: It is recommended to serve the files over HTTP to avoid CORS issues with modules or local storage restrictions (though direct file access may work on some browsers).
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Node.js (http-server)
   npx http-server -p 8000
   ```
3. **Open your browser** and navigate to `http://localhost:8000`.

## 📝 Notes & Limitations

- **Browser-Bound Data**: All application data (`users`, `orders`, `cakes`, `cart`) is confined to the specific browser's `localStorage` where it is running. Clearing site data will wipe the "database".
- **Security**: Authentication checks are entirely client-side. The admin password is hardcoded in `js/main.js`. This is solely for demonstration purposes and is not secure for production.
- **Image Uploads**: Uploaded images are stored as Base64 strings in `localStorage`. Due to storage limits (usually ~5MB per domain), adding too many large images may cause a `QuotaExceededError`. The built-in client-side compression mitigates this to some extent.

## 🔮 Future Enhancements

- **Backend Integration**: Replace `localStorage` with a robust backend service like Firebase, Supabase, or a custom Node/Express API + MongoDB.
- **Payment Gateway**: Integrate Stripe, Razorpay, or PayPal for real transactions.
- **Email Notifications**: Integrate SendGrid or emailjs for order confirmations and status updates.
- **State Management Library**: As the app grows, migrate from the raw `DB` object to Redux, Zustand, or Context API (if refactoring to React).
