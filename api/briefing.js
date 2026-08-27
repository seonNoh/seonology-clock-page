// worklog 아침 브리핑 통합.
// - /api/briefing/latest  최신 run 요약 + 본문(structured_result). worklog API 를 mTLS 로 프록시한다.
// - /api/briefing/mails   run 의 메일 목록(커서 페이지네이션) 프록시.
// - /api/briefing/events  run 의 일정 목록(커서 페이지네이션) 프록시.
// - /api/briefing/stream  신규 브리핑 SSE. NATS work.briefing.> 구독을 push 로 중계한다.
// worklog 호출은 공용 인그레스를 클라이언트 인증서(seon-clock-client)로 통과한다.
// 인증서나 NATS 설정이 없으면 브리핑 기능만 비활성화되고 다른 기능에는 영향이 없다.
const https = require('https');
const fs = require('fs');

const WORKLOG_BASE = (process.env.WORKLOG_API_BASE || '').replace(/\/$/, '');
const CERT_FILE = process.env.WORKLOG_CLIENT_CERT_FILE || '';
const KEY_FILE = process.env.WORKLOG_CLIENT_KEY_FILE || '';
const NATS_URL = process.env.NATS_URL || '';
const NATS_USER = process.env.NATS_USER || '';
const NATS_PASSWORD = process.env.NATS_PASSWORD || '';
const LATEST_TTL = 60 * 1000;

let tlsAgent = null;
function worklogConfigured() {
  if (tlsAgent) return true;
  try {
    if (!WORKLOG_BASE || !CERT_FILE || !KEY_FILE) return false;
    tlsAgent = new https.Agent({
      cert: fs.readFileSync(CERT_FILE),
      key: fs.readFileSync(KEY_FILE),
      keepAlive: true,
      maxSockets: 4,
    });
    return true;
  } catch {
    return false;
  }
}

function worklogGet(path) {
  return new Promise((resolve, reject) => {
    const req = https.request(`${WORKLOG_BASE}${path}`, { method: 'GET', agent: tlsAgent, timeout: 15000 }, (up) => {
      const chunks = [];
      up.on('data', (c) => chunks.push(c));
      up.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        if ((up.statusCode || 502) !== 200) return reject(new Error(`worklog ${path} status ${up.statusCode}`));
        try { resolve(JSON.parse(body)); } catch { reject(new Error(`worklog ${path} invalid json`)); }
      });
    });
    req.on('timeout', () => req.destroy(new Error('timeout after 15s')));
    req.on('error', (e) => reject(new Error(`worklog request error: ${e.message || e}`)));
    req.end();
  });
}

let latestCache = null; // { at, payload }
async function buildLatest() {
  const list = await worklogGet('/api/morning-briefing/runs?limit=1');
  const run = (list.items || [])[0];
  if (!run) return { run: null, detail: null };
  const detail = await worklogGet(`/api/morning-briefing/runs/${run.id}`);
  return { run, detail };
}
async function getLatest(force) {
  if (!force && latestCache && Date.now() - latestCache.at < LATEST_TTL) return latestCache.payload;
  const payload = await buildLatest();
  latestCache = { at: Date.now(), payload };
  return payload;
}

const RUN_ID_RE = /^[0-9a-f-]{36}$/;

// mails/events 는 run 하위 컬렉션을 커서로 넘겨받는 구조가 같아 한 핸들러로 처리한다.
// run_id 가 없으면 최신 run 을 쓰고, 최신 run 자체가 없으면 빈 목록을 200 으로 돌려준다.
function makeRunCollectionHandler(kind) {
  return async (req, res) => {
    if (!worklogConfigured()) return res.status(503).json({ error: 'briefing not configured' });

    const runIdParam = req.query.run_id;
    if (runIdParam !== undefined && !(typeof runIdParam === 'string' && RUN_ID_RE.test(runIdParam))) {
      return res.status(400).json({ error: 'invalid run_id' });
    }
    const cursorParam = req.query.cursor;
    if (cursorParam !== undefined && typeof cursorParam !== 'string') {
      return res.status(400).json({ error: 'invalid cursor' });
    }
    const limitParam = req.query.limit;
    let limit = null;
    if (limitParam !== undefined) {
      if (typeof limitParam !== 'string' || !/^\d+$/.test(limitParam)) return res.status(400).json({ error: 'invalid limit' });
      limit = Number(limitParam);
      if (limit < 1 || limit > 100) return res.status(400).json({ error: 'invalid limit' });
    }

    try {
      let runId = runIdParam;
      if (!runId) {
        const { run } = await getLatest(false);
        if (!run) return res.json({ items: [], next_cursor: '' });
        runId = String(run.id);
      }
      const qs = [];
      if (limit !== null) qs.push(`limit=${limit}`);
      if (cursorParam) qs.push(`cursor=${encodeURIComponent(cursorParam)}`);
      const suffix = qs.length ? `?${qs.join('&')}` : '';
      const payload = await worklogGet(`/api/morning-briefing/runs/${encodeURIComponent(runId)}/${kind}${suffix}`);
      res.json(payload);
    } catch (e) {
      res.status(502).json({ error: 'worklog upstream error', detail: String(e.message || e) });
    }
  };
}

const sseClients = new Set();
let lastEventFrame = null;
function broadcast(eventJson) {
  lastEventFrame = `event: briefing\ndata: ${eventJson}\n\n`;
  for (const res of sseClients) { try { res.write(lastEventFrame); } catch { /* gone */ } }
}

let busStarted = false;
async function startBriefingBus() {
  if (busStarted || !NATS_URL) return;
  busStarted = true;
  try {
    const { connect } = require('nats');
    const conn = await connect({
      servers: NATS_URL,
      user: NATS_USER || undefined,
      pass: NATS_PASSWORD || undefined,
      name: 'seonology-clock-briefing',
      maxReconnectAttempts: -1,
      waitOnFirstConnect: true,
    });
    console.log('[briefing] NATS connected');
    const subscription = conn.subscribe('work.briefing.>');
    (async () => {
      for await (const message of subscription) {
        const text = message.string();
        try { JSON.parse(text); } catch { continue; }
        latestCache = null; // 새 이벤트가 오면 다음 latest 조회가 재빌드하도록 비운다.
        broadcast(text);
      }
    })().catch((e) => console.error('[briefing] NATS subscription ended:', e.message || e));
  } catch (e) {
    busStarted = false;
    console.error('[briefing] NATS connect failed:', e.message || e);
    setTimeout(startBriefingBus, 30000);
  }
}

function setupBriefingRoutes(app) {
  app.get('/api/briefing/latest', async (req, res) => {
    if (!worklogConfigured()) return res.status(503).json({ error: 'briefing not configured' });
    try {
      const payload = await getLatest(req.query.refresh === '1');
      res.json(payload);
    } catch (e) {
      res.status(502).json({ error: 'worklog upstream error', detail: String(e.message || e) });
    }
  });

  app.get('/api/briefing/mails', makeRunCollectionHandler('mails'));
  app.get('/api/briefing/events', makeRunCollectionHandler('events'));

  app.get('/api/briefing/stream', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write('retry: 5000\n\n');
    if (lastEventFrame) { try { res.write(lastEventFrame); } catch { /* gone */ } }
    sseClients.add(res);
    const hb = setInterval(() => { try { res.write(': hb\n\n'); } catch { /* gone */ } }, 25000);
    req.on('close', () => { clearInterval(hb); sseClients.delete(res); });
  });

  startBriefingBus();
}

module.exports = { setupBriefingRoutes };
