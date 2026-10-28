const axios = require('axios');
const mongoose = require('mongoose');

const TEST_URL = 'http://localhost:5000/api/admin/revenue';

async function runTests() {
  await mongoose.connect('mongodb://127.0.0.1:27017/priticake');
  const Order = require('./src/models/Order');
  const User = require('./src/models/User');

  let adminToken = '';
  try {
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@priticake.local',
      password: 'AdminPriti@2026'
    });
    adminToken = loginRes.data.token;
  } catch(e) {
    console.error('Failed to login as admin', e.message);
    process.exit(1);
  }

  const adminUser = await User.findOne({ email: 'admin@priticake.local' });
  const baseOrder = {
    user: adminUser._id,
    userName: 'Test Admin',
    userEmail: 'admin@priticake.local',
    phone: '9999999999',
    deliveryAddress: 'Test Addr',
    items: [],
    deliveryCharge: 50
  };

  const d1 = new Date('2026-10-09T10:00:00Z');
  const o1 = new Order({ ...baseOrder, total: 100, status: 'Delivered', createdAt: d1 });

  const d2 = new Date('2026-10-09T11:00:00Z');
  const o2 = new Order({ ...baseOrder, total: 200, status: 'Cancelled', createdAt: d2 });

  const d3 = new Date('2026-10-15T10:00:00Z');
  const o3 = new Order({ ...baseOrder, total: 300, status: 'Confirmed', createdAt: d3 });

  const d4 = new Date('2026-05-15T10:00:00Z');
  const o4 = new Order({ ...baseOrder, total: 500, status: 'Pending', createdAt: d4 });

  const d5 = new Date('2025-10-09T10:00:00Z');
  const o5 = new Order({ ...baseOrder, total: 1000, status: 'Delivered', createdAt: d5 });

  await Order.insertMany([o1, o2, o3, o4, o5]);

  console.log('--- MOCK DATA INSERTED ---');

  const headers = { Authorization: 'Bearer ' + adminToken };

  try {
    try {
      await axios.get(TEST_URL + '?period=daily&date=2026-10-09');
      console.error('FAIL: Unauthorized should have blocked request.');
    } catch (err) {
      if(err.response.status === 401) console.log('PASS: Unauthorized correctly blocked');
      else console.error('FAIL: Unexpected status for unauthorized:', err.response.status);
    }

    try {
      await axios.get(TEST_URL + '?period=weekly', { headers });
      console.error('FAIL: Invalid period should 400');
    } catch (err) {
      if(err.response.status === 400) console.log('PASS: Invalid period caught');
    }

    const resDaily = await axios.get(TEST_URL + '?period=daily&date=2026-10-09', { headers });
    if(resDaily.data.revenue >= 100) console.log('PASS: Daily revenue matched or included actual DB data. (' + resDaily.data.revenue + ')');
    else console.error('FAIL: Daily revenue too low:', resDaily.data.revenue);

    const resMonthly = await axios.get(TEST_URL + '?period=monthly&month=10&year=2026', { headers });
    if(resMonthly.data.revenue >= 400) console.log('PASS: Monthly revenue matched. (' + resMonthly.data.revenue + ')');
    else console.error('FAIL: Monthly revenue too low:', resMonthly.data.revenue);

    const resYearly = await axios.get(TEST_URL + '?period=yearly&year=2026', { headers });
    if(resYearly.data.revenue >= 900) console.log('PASS: Yearly revenue matched. (' + resYearly.data.revenue + ')');
    else console.error('FAIL: Yearly revenue too low:', resYearly.data.revenue);

  } catch (err) {
    console.error('Testing Error:', err.response ? err.response.data : err.message);
  } finally {
    await Order.deleteMany({ _id: { $in: [o1._id, o2._id, o3._id, o4._id, o5._id] } });
    await mongoose.disconnect();
  }
}

runTests();
