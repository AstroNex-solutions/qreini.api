const http = require('http');

function request(url, method, data, token = null) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : '';
    const parsed = new URL(url);

    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname,
      method: method,
      headers: headers
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function run() {
  console.log('--- 1. Testing Registration ---');
  const regRes = await request('http://localhost:5000/api/customer/register', 'POST', {
    name: 'أحمد عميل القريني',
    email: 'ahmed.qreini.test@gmail.com',
    password: 'password123',
    phone: '0799998877',
    address: 'عمان - شارع وصفي التل'
  });
  console.log('Register Result:', regRes);

  console.log('\n--- 2. Testing Login ---');
  const loginRes = await request('http://localhost:5000/api/customer/login', 'POST', {
    email: 'ahmed.qreini.test@gmail.com',
    password: 'password123'
  });
  console.log('Login Result:', loginRes);

  console.log('\n--- 3. Testing Forgot Password (OTP) ---');
  const forgotRes = await request('http://localhost:5000/api/customer/forgot-password', 'POST', {
    email: 'ahmed.qreini.test@gmail.com'
  });
  console.log('Forgot Password Result:', forgotRes);

  console.log('\n--- 4. Checking Customer Record in DB for OTP ---');
  const { Customer } = require('./src/models');
  const customer = await Customer.findOne({ where: { email: 'ahmed.qreini.test@gmail.com' } });
  console.log('Stored OTP in DB:', customer.resetPasswordOtp);

  console.log('\n--- 5. Testing Reset Password with OTP ---');
  const resetRes = await request('http://localhost:5000/api/customer/reset-password', 'POST', {
    email: 'ahmed.qreini.test@gmail.com',
    otp: customer.resetPasswordOtp,
    newPassword: 'newSecretPassword2026'
  });
  console.log('Reset Password Result:', resetRes);

  console.log('\n--- 6. Testing Login with New Password ---');
  const loginNewRes = await request('http://localhost:5000/api/customer/login', 'POST', {
    email: 'ahmed.qreini.test@gmail.com',
    password: 'newSecretPassword2026'
  });
  console.log('Login with New Password Result:', loginNewRes.status === 200 ? 'SUCCESS!' : 'FAILED');

  process.exit(0);
}

run().catch(console.error);
