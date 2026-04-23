const TOKEN = process.env.RAILWAY_TOKEN || process.argv[2];
const DEP = process.argv[3];
if (!TOKEN || !DEP) { console.error('Usage: node wait-deploy.js <token> <deploymentId>'); process.exit(1); }

async function q(query, variables) {
  const r = await fetch('https://backboard.railway.app/graphql/v2', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables })
  });
  return r.json();
}

(async () => {
  let last = null;
  const start = Date.now();
  while (true) {
    const r = await q('query D($id: String!) { deployment(id: $id) { status } }', { id: DEP });
    const s = r.data?.deployment?.status;
    if (s !== last) { console.log(`[${Math.round((Date.now()-start)/1000)}s]`, s); last = s; }
    if (['SUCCESS', 'DEPLOYED'].includes(s)) { console.log('✅ deployed'); process.exit(0); }
    if (['FAILED', 'CRASHED', 'REMOVED'].includes(s)) { console.error('❌ failed:', s); process.exit(1); }
    await new Promise(r => setTimeout(r, 5000));
    if (Date.now() - start > 600000) { console.error('timed out'); process.exit(1); }
  }
})();
