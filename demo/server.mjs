// Synthetic local test target. No real banking data or production services.
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const users = new Map();
const sessions = new Map();
const applications = new Map();
const idempotency = new Map();
const port = Number(process.env.PORT || 4317);
const json = (res, status, body, headers = {}) => {
  res.writeHead(status, { 'content-type': 'application/json', ...headers });
  res.end(JSON.stringify(body));
};
async function body(req) {
  let data = '';
  for await (const chunk of req) {
    data += chunk;
    if (data.length > 10000) throw new Error('body too large');
  }
  return JSON.parse(data || '{}');
}
function currentUser(req) {
  const token = /(?:^|;\s*)session=([^;]+)/.exec(req.headers.cookie || '')?.[1];
  return users.get(sessions.get(token));
}

const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (path === '/health') return json(res, 200, { service: 'synthetic-bank', status: 'ok' });
  if (req.method === 'GET' && path === '/') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    return res.end(await readFile(new URL('./index.html', import.meta.url)));
  }
  if (req.method === 'POST' && path === '/api/users') {
    let input;
    try { input = await body(req); } catch { return json(res, 400, { error: 'Invalid JSON' }); }
    if (typeof input.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) ||
        typeof input.password !== 'string' || input.password.length < 10) {
      return json(res, 422, { error: 'Valid email and password of at least 10 characters required' });
    }
    if ([...users.values()].some(user => user.email === input.email)) return json(res, 409, { error: 'Email already exists' });
    const user = { id: randomUUID(), email: input.email, password: input.password };
    users.set(user.id, user);
    return json(res, 201, { id: user.id, email: user.email });
  }
  if (req.method === 'POST' && path === '/api/login') {
    let input;
    try { input = await body(req); } catch { return json(res, 400, { error: 'Invalid JSON' }); }
    const user = [...users.values()].find(item => item.email === input.email && item.password === input.password);
    if (!user) return json(res, 401, { error: 'Invalid credentials' });
    const token = randomUUID();
    sessions.set(token, user.id);
    return json(res, 200, { email: user.email }, { 'set-cookie': `session=${token}; HttpOnly; SameSite=Strict; Path=/` });
  }
  const user = currentUser(req);
  if (path.startsWith('/api/') && !user) return json(res, 401, { error: 'Sign in required' });
  if (req.method === 'POST' && path === '/api/logout') {
    const token = /(?:^|;\s*)session=([^;]+)/.exec(req.headers.cookie || '')?.[1];
    sessions.delete(token);
    return json(res, 200, { ok: true }, { 'set-cookie': 'session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
  }
  if (req.method === 'GET' && path === '/api/account') {
    // Deliberate fault used only by the negative-control verification command.
    return json(res, 200, { email: user.email, balanceMinor: process.env.QA_MUTATE_BALANCE === '1' ? 125076 : 125075, currency: 'USD' });
  }
  if (req.method === 'POST' && path === '/api/applications') {
    let input;
    try { input = await body(req); } catch { return json(res, 400, { error: 'Invalid JSON' }); }
    if (!Number.isInteger(input.amountMinor) || input.amountMinor < 10000 || input.amountMinor > 1000000) {
      return json(res, 422, { error: 'Amount must be an integer between 10000 and 1000000 cents' });
    }
    const key = req.headers['idempotency-key'];
    if (!key || typeof key !== 'string') return json(res, 400, { error: 'Idempotency-Key required' });
    const scopedKey = `${user.id}:${key}`;
    const previous = idempotency.get(scopedKey);
    if (previous) {
      if (previous.amountMinor !== input.amountMinor) return json(res, 409, { error: 'Key already used with another amount' });
      return json(res, 200, previous);
    }
    const application = { id: randomUUID(), userId: user.id, amountMinor: input.amountMinor, currency: 'USD', status: 'submitted' };
    applications.set(application.id, application);
    idempotency.set(scopedKey, application);
    return json(res, 201, application);
  }
  if (req.method === 'GET' && path === '/api/applications') {
    return json(res, 200, [...applications.values()].filter(item => item.userId === user.id));
  }
  if (req.method === 'GET' && path.startsWith('/api/applications/')) {
    const application = applications.get(path.split('/').at(-1));
    if (!application || application.userId !== user.id) return json(res, 404, { error: 'Not found' });
    return json(res, 200, application);
  }
  return json(res, 404, { error: 'Not found' });
});
server.listen(port, '127.0.0.1', () => console.log(`Synthetic bank: http://127.0.0.1:${port}`));
