require('dotenv').config();
const http = require('http');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: 'localhost',
      port: 5001,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        console.log('STATUS:', res.statusCode);
        console.log('BODY:', raw.substring(0, 500));
        resolve({ status: res.statusCode, raw });
      });
    });
    req.on('error', e => {
      console.log('REQUEST ERROR:', e.message);
      resolve({ error: e.message });
    });
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('Testing login...');
  await post('/api/auth/login', { email: 'admin@kosqu.com', password: 'Admin@1234' });
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
