# Priti's Cake

A fully responsive bakery e-commerce application designed for a custom cake shop. The project includes a customer-facing storefront and a fully integrated administration dashboard with a Node.js/Express backend and MongoDB database.

## Overview

The application is split into two primary experiences:
1. **Customer Storefront:** A client-side experience built with Vanilla JavaScript, allowing users to browse the cake catalog, manage their shopping cart, and view order history.
2. **Admin Dashboard:** A secure, API-driven operations portal for administrators to manage the bakery's catalog, orders, customers, and shop configurations.

The frontend communicates with a RESTful Express API. The backend handles data persistence via MongoDB and secures administrative endpoints using JSON Web Tokens (JWT).

## Features

### Customer Side
- Browse cakes by category
- View detailed cake information (price, weight, serving size, preparation time)
- Customer authentication and registration
- Persistent shopping cart functionality
- Checkout and order placement
- Customer dashboard to view active and past order history

### Admin Dashboard
- **Dashboard Overview:** Key performance indicators (KPIs) and recent order snapshots.
- **Cake/Catalog Management:** Create, read, update, and delete (CRUD) functionality for the cake menu.
- **Image Handling:** Cake image upload functionality with live preview and replacement support.
- **Order Management:** View, search, and filter customer orders.
- **Order Status Updates:** Update fulfillment states (e.g., Pending, Confirmed, Preparing, Out for Delivery, Delivered, Cancelled).
- **Customer Management:** Search the customer database and view lifetime order metrics.
- **Customer Order History:** Detailed view of individual customer purchase history.
- **Shop Settings:** Configure shop information, delivery charges, minimum order amounts, and business hours.
- **Admin Authentication:** Secure login using JWT authentication.
- **Logout:** Secure session termination.

## Technology Stack

### Frontend
- HTML5
- CSS3
- Vanilla JavaScript (ES6)

### Backend
- Node.js
- Express.js
- JSON Web Tokens (JWT) for authentication
- Bcrypt.js for password hashing
- Multer for multipart/form-data image uploads
- Helmet & Express Mongo Sanitize for API security
- CORS

### Database
- MongoDB
- Mongoose (ODM)

### Development Tools
- Nodemon (Development server)
- Dotenv (Environment variable management)

## Project Structure

```text
project-root/
├── Priti's_Cake/
│   ├── css/
│   │   ├── dashboard.css
│   │   └── style.css
│   ├── js/
│   │   ├── admin.js
│   │   ├── api.js
│   │   ├── client.js
│   │   └── main.js
│   ├── about.html
│   ├── admin-dashboard.html
│   ├── admin-login.html
│   ├── catalog.html
│   ├── client-dashboard.html
│   ├── contact.html
│   ├── gallery.html
│   ├── index.html
│   └── login.html
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js
│   │   ├── controllers/
│   │   │   ├── admin.controller.js
│   │   │   ├── cake.controller.js
│   │   │   ├── customer.controller.js
│   │   │   ├── order.controller.js
│   │   │   └── settings.controller.js
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js
│   │   │   └── upload.middleware.js
│   │   ├── models/
│   │   │   ├── Cake.js
│   │   │   ├── Order.js
│   │   │   ├── ShopSettings.js
│   │   │   └── User.js
│   │   ├── routes/
│   │   │   ├── admin.routes.js
│   │   │   ├── auth.routes.js
│   │   │   ├── cake.routes.js
│   │   │   ├── customer.routes.js
│   │   │   ├── health.routes.js
│   │   │   ├── order.routes.js
│   │   │   └── settings.routes.js
│   │   ├── scripts/
│   │   │   └── seedAdmin.js
│   │   └── server.js
│   ├── uploads/
│   ├── .env.example
│   ├── .gitignore
│   ├── package-lock.json
│   └── package.json
└── README.md
```
