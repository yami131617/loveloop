const BASE = process.env.BASE_URL || 'http://localhost:5000';
const TAG = Date.now();

let lastRes = null;
async function req(method, path, body, token) {
  const h = { 'Content-Type': 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  const r = await fetch(BASE + path, {
    method, headers: h,
    body: body == null ? undefined : JSON.stringify(body)
  });
  const text = await r.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  lastRes = { status: r.status, body: json };
  return lastRes;
}

function ok(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); console.error(' last:', JSON.stringify(lastRes, null, 2)); process.exit(1); }
  console.log('  OK', msg);
}

async function register(tag) {
  const r = await req('POST', '/auth/register', {
    email: `u${tag}@test.com`, password: 'password123',
    username: `u${tag}`, display_name: `User ${tag}`
  });
  if (r.status !== 201) throw new Error(`register failed ${JSON.stringify(r)}`);
  return { id: r.body.user.id, token: r.body.token };
}

async function main() {
  console.log('== Health ==');
  let r = await req('GET', '/health'); ok(r.status === 200, 'health 200');
  r = await req('GET', '/ready'); ok(r.status === 200 && r.body.db === 'up', 'ready DB up');

  console.log('\n== Auth ==');
  const alice = await register(`a${TAG}`);
  console.log('  registered alice:', alice.id);
  const bob = await register(`b${TAG}`);
  console.log('  registered bob:', bob.id);

  r = await req('POST', '/auth/login', { email: `ua${TAG}@test.com`, password: 'password123' });
  ok(r.status === 200, 'login OK');

  r = await req('GET', '/auth/me', null, alice.token);
  ok(r.status === 200, 'me OK');
  ok(r.body.user.username === `ua${TAG}`, 'me username matches');

  console.log('\n== Profile ==');
  r = await req('GET', '/profile/interests');
  ok(r.status === 200 && Array.isArray(r.body.interests), 'interests list');

  r = await req('PUT', '/profile/', {
    bio: 'Hi I love music!', age: 25, gender: 'female',
    interests: ['Music', 'Gaming', 'Travel']
  }, alice.token);
  ok(r.status === 200, 'profile updated');

  r = await req('PUT', '/profile/', {
    bio: 'Hey tech guy', age: 27, gender: 'male',
    interests: ['Tech', 'Gaming', 'Music']
  }, bob.token);
  ok(r.status === 200, 'bob profile updated');

  r = await req('GET', `/profile/${bob.id}`);
  ok(r.status === 200 && r.body.interests.includes('Tech'), 'get profile');

  console.log('\n== Swipe ==');
  r = await req('GET', '/swipe/cards', null, alice.token);
  ok(r.status === 200 && Array.isArray(r.body.cards), 'cards array');

  // Alice likes Bob
  r = await req('POST', `/swipe/${bob.id}`, { action: 'like' }, alice.token);
  ok(r.status === 200 && r.body.matched === false, 'alice like bob (no match yet)');

  // Bob likes Alice → match!
  r = await req('POST', `/swipe/${alice.id}`, { action: 'like' }, bob.token);
  ok(r.status === 200 && r.body.matched === true, 'bob like alice → MATCH');
  const matchId = r.body.match.id;

  // Self-swipe rejected
  r = await req('POST', `/swipe/${alice.id}`, { action: 'like' }, alice.token);
  ok(r.status === 400, 'self-swipe rejected');

  // List matches
  r = await req('GET', '/swipe/matches/list', null, alice.token);
  ok(r.status === 200 && r.body.matches.length > 0, 'matches list');

  console.log('\n== Chat ==');
  r = await req('POST', `/chat/${matchId}/message`, { content: 'Hey Bob!' }, alice.token);
  ok(r.status === 201, 'alice sends message');

  r = await req('POST', `/chat/${matchId}/message`, { content: 'Hi Alice!' }, bob.token);
  ok(r.status === 201, 'bob sends message');

  r = await req('GET', `/chat/${matchId}/messages`, null, alice.token);
  ok(r.status === 200 && r.body.messages.length === 2, 'fetch messages');

  // Non-member blocked
  const charlie = await register(`c${TAG}`);
  r = await req('GET', `/chat/${matchId}/messages`, null, charlie.token);
  ok(r.status === 403, 'non-member blocked from chat');

  console.log('\n== Games ==');
  r = await req('GET', '/games/types');
  ok(r.status === 200 && r.body.games.length === 5, '5 game types');

  r = await req('POST', '/games/start', { match_id: matchId, game_type: 'quiz' }, alice.token);
  ok(r.status === 201, 'start quiz game');
  const sessionId = r.body.session.id;

  r = await req('POST', `/games/${sessionId}/end`, {
    player1_score: 40, player2_score: 30
  }, alice.token);
  ok(r.status === 200, 'end game');
  ok(r.body.winner_id, 'winner declared');
  ok(r.body.total_games === 1, 'match game count incremented');

  // Alice should now have more coins
  r = await req('GET', '/auth/me', null, alice.token);
  ok(parseInt(r.body.user.coins_balance) > 100, `alice coins increased (${r.body.user.coins_balance})`);
  ok(r.body.user.total_xp > 0, `alice XP increased (${r.body.user.total_xp})`);

  console.log('\n== Leaderboard ==');
  r = await req('GET', '/leaderboard/hearts');
  ok(r.status === 200 && Array.isArray(r.body.leaderboard), 'hearts leaderboard');

  r = await req('GET', '/leaderboard/level');
  ok(r.status === 200 && Array.isArray(r.body.leaderboard), 'level leaderboard');

  r = await req('GET', '/leaderboard/me', null, alice.token);
  ok(r.status === 200 && typeof r.body.rank === 'number', 'my rank');

  console.log('\n== Cosmetics ==');
  r = await req('GET', '/cosmetics/shop');
  ok(r.status === 200, 'shop listing');

  r = await req('GET', '/cosmetics/owned', null, alice.token);
  ok(r.status === 200 && Array.isArray(r.body.owned), 'owned list');

  console.log('\n== Auth security ==');
  r = await req('GET', '/auth/me'); ok(r.status === 401, 'no token rejected');
  r = await req('GET', '/auth/me', null, 'garbage'); ok(r.status === 401, 'bad token rejected');

  console.log('\n=== ALL SMOKE TESTS PASSED ===');
}

main().catch(err => { console.error('THREW:', err); process.exit(1); });
