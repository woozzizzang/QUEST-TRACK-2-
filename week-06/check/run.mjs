// 확인 도구 (week-06: 게임 말고 일반 웹페이지도 확인. canvas 가 없으면 화면 전체를 찍음)
// 게임을 화면 없는 Edge 로 열고(두 번 눌러 열 때와 같은 file:// 방식), 시나리오대로 키를 대신 누르며
// 게임 상태를 읽고 사진을 찍는다. 새로 설치할 것 없이 Node.js 와 컴퓨터에 있는 Edge 만 쓴다.
//
// 쓰는 법 (QUEST-TRACK-2- 폴더에서):
//   node week-06/check/run.mjs week-06/index.html week-06/check/weather.mjs
// 사진은 week-06/check/shots/<시나리오 이름>/ 에 저장된다. (커밋하지 않음)
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, basename, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const [gameArg, scenarioArg] = process.argv.slice(2);
if (!gameArg || !scenarioArg) {
  console.log('쓰는 법: node week-06/check/run.mjs <게임 index.html> <시나리오 .mjs>');
  process.exit(1);
}
const gamePath = resolve(gameArg);
const scenarioPath = resolve(scenarioArg);
const shotDir = resolve(HERE, 'shots', basename(scenarioPath, '.mjs'));
mkdirSync(shotDir, { recursive: true });

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9333;
const edge = spawn(EDGE, ['--headless', '--disable-gpu', `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${resolve(HERE, 'edge-profile')}`, '--window-size=1100,700', '--mute-audio', 'about:blank']);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Edge 와 연결
let targets;
for (let i = 0; i < 50; i++) {
  try {
    targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
    if (targets.find(t => t.type === 'page')) break;
  } catch {}
  await sleep(200);
}
const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0;
const waiting = new Map();
const browserLogs = [];
const listeners = []; // 시나리오가 브라우저 소식(예: Fetch.requestPaused)을 받을 때 씀
const on = (method, fn) => listeners.push([method, fn]);
ws.onmessage = m => {
  const d = JSON.parse(m.data);
  for (const [method, fn] of listeners) if (d.method === method) fn(d.params);
  if (d.id && waiting.has(d.id)) { waiting.get(d.id)(d); waiting.delete(d.id); }
  if (d.method === 'Runtime.exceptionThrown') browserLogs.push('오류 ' + d.params.exceptionDetails.exception?.description);
  if (d.method === 'Runtime.consoleAPICalled') browserLogs.push('console ' + d.params.args.map(a => a.value).join(' '));
  if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error') browserLogs.push('오류 ' + d.params.entry.text + ' ' + (d.params.entry.url || ''));
};
const send = (method, params = {}) => new Promise(r => {
  const i = ++id;
  waiting.set(i, r);
  ws.send(JSON.stringify({ id: i, method, params }));
});

// 시나리오에서 쓰는 도구들
const ev = async expr => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) throw new Error('게임 안에서 실행 실패: ' + r.result.exceptionDetails.exception?.description);
  return r.result?.result?.value;
};
const KEYS = {
  ArrowRight: ['ArrowRight', 39], ArrowLeft: ['ArrowLeft', 37], ArrowUp: ['ArrowUp', 38], ArrowDown: ['ArrowDown', 40],
  Space: [' ', 32], Enter: ['Enter', 13], KeyR: ['r', 82], ShiftLeft: ['Shift', 16],
};
const keyEvent = (type, code) => send('Input.dispatchKeyEvent', { type, code, key: KEYS[code][0], windowsVirtualKeyCode: KEYS[code][1] });
const down = code => keyEvent('keyDown', code);
const up = code => keyEvent('keyUp', code);
const tap = async code => { await down(code); await sleep(40); await up(code); };
const shot = async name => {
  // 게임 화면(canvas) 둘레만 찍음
  const box = await ev(`(() => { const c = document.querySelector('canvas'); if (!c) return null;
    const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })()`);
  const params = { format: 'png' };
  if (box) params.clip = { ...box, scale: 1 };
  const r = await send('Page.captureScreenshot', params);
  const file = resolve(shotDir, name + '.png');
  writeFileSync(file, Buffer.from(r.result.data, 'base64'));
  return file;
};
const waitUntil = async (expr, ms = 3000) => {
  const t = Date.now();
  while (Date.now() - t < ms) { if (await ev(expr)) return true; await sleep(10); }
  return false;
};
const log = (...a) => console.log(...a);

await send('Runtime.enable');
await send('Page.enable');
await send('Log.enable');
await send('Page.navigate', { url: pathToFileURL(gamePath).href });
await sleep(1500);

try {
  const scenario = await import(pathToFileURL(scenarioPath).href);
  await scenario.default({ ev, down, up, tap, shot, sleep, waitUntil, log, send, on });
} catch (e) {
  console.log('시나리오 실행 중 문제:', e.message);
}
console.log('--- 브라우저 오류 ---');
console.log(browserLogs.length ? browserLogs.join('\n') : '없음');
console.log('사진 폴더:', shotDir);
ws.close();
edge.kill();
process.exit(0);
