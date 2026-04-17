// Test fetch to health endpoint
console.log('Testing fetch...');
const API_BASE_URL = '';
const path = '/health';

fetch(`${API_BASE_URL}${path}`, {
  headers: { 'Content-Type': 'application/json' }
})
  .then(res => {
    console.log('Response status:', res.status);
    console.log('Response headers:', res.headers);
    return res.json();
  })
  .then(data => {
    console.log('Data:', data);
  })
  .catch(err => {
    console.error('Error:', err);
  });
