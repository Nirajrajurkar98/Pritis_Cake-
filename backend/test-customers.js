const axios = require('axios');
async function testCustomers() {
  try {
    const login = await axios.post('http://localhost:5000/api/auth/login', { email: 'admin@priticake.local', password: 'AdminPriti@2026' });
    const token = login.data.token;
    console.log('Token:', token ? 'Exists' : 'Missing');

    const res = await axios.get('http://localhost:5000/api/admin/customers', { headers: { Authorization: 'Bearer ' + token }});
    console.log('Customers response isArray:', Array.isArray(res.data));
    console.log('Data:', res.data);
  } catch(e) {
    console.error('Error:', e.response ? e.response.data : e.message);
  }
}
testCustomers();
