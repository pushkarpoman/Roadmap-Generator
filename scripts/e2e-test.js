// Lightweight E2E smoke test for local dev
// Usage: node scripts/e2e-test.js

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const crypto = require('crypto');

async function safeFetch(url, opts = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch(e) { json = null; }
  return { res, text, json };
}

(async function main(){
  try {
    console.log('E2E: Starting against', BASE);
    const email = `e2e+${Date.now()}@example.com`;
    const password = 'test1234';

    // Register
    const register = await safeFetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'E2E Test', email, password })
    });

    if (register.res.status !== 201) {
      console.error('Register failed', register.res.status, register.text);
      process.exit(2);
    }

    const token = register.json?.token;
    if (!token) {
      console.error('No token returned from register');
      process.exit(3);
    }

    console.log('Registered user id=', register.json.user.id);

    // Create roadmap
    const roadmapBody = { title: 'E2E Roadmap', content: { phases: [{ title: 'P1', tasks: ['a','b'] }] } };
    const save = await safeFetch(`${BASE}/api/roadmap`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'cookie': `rg_token=${token}` },
      body: JSON.stringify(roadmapBody)
    });

    if (![200,201].includes(save.res.status)) {
      console.error('Save roadmap failed', save.res.status, save.text);
      process.exit(4);
    }

    console.log('Saved roadmap id=', save.json?.id);

    // Fetch history
    const hist = await safeFetch(`${BASE}/api/roadmap/history`, {
      method: 'GET',
      headers: { 'cookie': `rg_token=${token}` }
    });

    if (hist.res.status !== 200) {
      console.error('History fetch failed', hist.res.status, hist.text);
      process.exit(5);
    }

    const found = (hist.json || []).find(r => r.title === 'E2E Roadmap');
    if (!found) {
      console.error('Saved roadmap not present in history', hist.json);
      process.exit(6);
    }

    console.log('History contains roadmap id=', found.id);
    console.log('E2E: All checks passed');
    process.exit(0);
  } catch (err) {
    console.error('E2E script error', err);
    process.exit(1);
  }
})();
