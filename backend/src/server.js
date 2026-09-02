const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const cakeRoutes = require('./routes/cake.routes');
const orderRoutes = require('./routes/order.routes');
const customerRoutes = require('./routes/customer.routes');
const settingsRoutes = require('./routes/settings.routes');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

const path = require('path');

// Middleware
app.use(express.json());

// Serve uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// CORS configuration (allow local dev frontend)
app.use(cors()); // Allow all origins for local development

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin/cakes', cakeRoutes);
app.use('/api/admin/orders', orderRoutes);
app.use('/api/admin/customers', customerRoutes);
app.use('/api/admin/settings', settingsRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
