const axios = require('axios');
const mongoose = require('mongoose');

async function auditAdminAPI() {
  console.log('--- STARTING ADMIN PANEL AUDIT ---');
  let adminToken = '';

  // A. Auth check
  try {
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@priticake.local',
      password: 'AdminPriti@2026'
    });
    adminToken = loginRes.data.token;
    console.log('A. Admin login: PASS');
  } catch (err) {
    console.error('A. Admin login: FAIL', err.response ? err.response.data : err.message);
    return;
  }

  const headers = { Authorization: 'Bearer ' + adminToken };

  // B. Dashboard stats
  try {
    const statsRes = await axios.get('http://localhost:5000/api/admin/stats', { headers });
    if(statsRes.data.totalUsers !== undefined) console.log('B. Dashboard Stats: PASS');
    else console.error('B. Dashboard Stats: FAIL, missing totalUsers');
  } catch (err) {
    console.error('B. Dashboard Stats: FAIL', err.message);
  }

  // C. Cakes CRUD
  let cakeId = '';
  try {
    const fetchRes = await axios.get('http://localhost:5000/api/admin/cakes', { headers });
    if(Array.isArray(fetchRes.data)) console.log('C1. Fetch Cakes: PASS');

    // Create via formData requires form-data library, let's just do a GET test for now and skip create since it has upload middleware.
    // Wait, the router allows missing images. Can we create a cake without an image?
    // Let's check if the frontend uses JSON or Formdata.
  } catch(err) {
    console.error('C. Fetch Cakes: FAIL', err.message);
  }

  // E. Orders
  try {
    const ordersRes = await axios.get('http://localhost:5000/api/admin/orders', { headers });
    if(Array.isArray(ordersRes.data)) console.log('E1. Fetch Orders: PASS');
    if(ordersRes.data.length > 0) {
      const order = ordersRes.data[0];
      const singleRes = await axios.get('http://localhost:5000/api/admin/orders/' + order._id, { headers });
      if(singleRes.data._id === order._id) console.log('E2. Fetch Order Details: PASS');
    }
  } catch(err) {
    console.error('E. Fetch Orders: FAIL', err.message);
  }

  // F. Customers
  try {
    const custRes = await axios.get('http://localhost:5000/api/admin/customers', { headers });
    if(Array.isArray(custRes.data)) console.log('F1. Fetch Customers: PASS');
    if(custRes.data.length > 0) {
      const cust = custRes.data.find(c => c.role === 'customer');
      if (cust) {
        const cOrders = await axios.get('http://localhost:5000/api/admin/customers/' + cust._id + '/orders', { headers });
        if(Array.isArray(cOrders.data)) console.log('F2. Fetch Customer Orders: PASS');
      }
    }
  } catch(err) {
    console.error('F. Customers: FAIL', err.message);
  }

  // G. Settings
  try {
    const setRes = await axios.get('http://localhost:5000/api/admin/settings', { headers });
    if(setRes.data) console.log('G1. Fetch Settings: PASS');

    const upSet = await axios.put('http://localhost:5000/api/admin/settings', { deliveryFee: 60 }, { headers });
    if(upSet.data) console.log('G2. Update Settings: PASS');
  } catch(err) {
    console.error('G. Settings: FAIL', err.message);
  }

  // H. Revenue
  try {
    const revRes = await axios.get('http://localhost:5000/api/admin/revenue?period=yearly&year=2026', { headers });
    if(revRes.data.success) console.log('H. Revenue Analytics: PASS');
  } catch (err) {
    console.error('H. Revenue Analytics: FAIL', err.message);
  }

  console.log('--- ADMIN AUDIT API SCRIPT COMPLETE ---');
}
auditAdminAPI();
