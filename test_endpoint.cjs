const axios = require('axios');

async function testEndpoint() {
  try {
    // First login to get a token
    const loginResponse = await axios.post('http://localhost:5100/api/login', {
      email: 'jziegenhorn@teamexpansion.org',
      password: '#NPLIL'
    });
    
    const token = loginResponse.data.token;
    console.log('Login successful, token:', token.substring(0, 20) + '...');
    
    // Now test the coordinator data endpoint
    const dataResponse = await axios.get('http://localhost:5100/api/coordinator/data', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Coordinator data response:');
    console.log(JSON.stringify(dataResponse.data, null, 2));
    
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

testEndpoint(); 