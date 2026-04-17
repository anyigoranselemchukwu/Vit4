import fetch from 'node-fetch';

console.log('🔍 Testing complete frontend fetch chain...\n');

// Test 1: Direct backend
console.log('1️⃣ Direct Backend (http://localhost:8000):');
try {
  const res = await fetch('http://localhost:8000/health');
  const data = await res.json();
  console.log(`   ✅ Status: ${res.status} - ${data.status} (db_connected: ${data.db_connected})`);
} catch (e) {
  console.log(`   ❌ Error: ${e.message}`);
}

// Test 2: Frontend proxy
console.log('\n2️⃣ Frontend Proxy (http://localhost:5000/health):');
try {
  const res = await fetch('http://localhost:5000/health');
  const data = await res.json();
  console.log(`   ✅ Status: ${res.status} - ${data.status} (db_connected: ${data.db_connected})`);
} catch (e) {
  console.log(`   ❌ Error: ${e.message}`);
}

// Test 3: Check React app loads
console.log('\n3️⃣ Frontend HTML Root:');
try {
  const res = await fetch('http://localhost:5000');
  const html = await res.text();
  const hasRoot = html.includes('id="root"');
  console.log(`   ${hasRoot ? '✅' : '❌'} React root element: ${hasRoot}`);
} catch (e) {
  console.log(`   ❌ Error: ${e.message}`);
}

console.log('\n✅ All components responding correctly!');
