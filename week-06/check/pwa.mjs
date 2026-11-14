// 날씨 앱 PWA 확인 시나리오
// 쓰는 법 (QUEST-TRACK-2- 폴더에서):
//   node week-06/check/run.mjs week-06/index.html week-06/check/pwa.mjs
//
// 서비스 워커는 file:// 에서는 돌지 않아서, 이 시나리오가 작은 웹 서버를 직접 켬.
// GitHub Pages 와 똑같이 http://127.0.0.1:8606/QUEST-TRACK-2-/week-06/ 주소로 엶.
// 1. manifest 와 아이콘을 읽을 수 있는지, 설치할 수 있는 앱인지
// 2. 서비스 워커가 준비되는지, 날씨를 받아 오는지
// 3. 서버도 끄고 인터넷도 끊은 뒤 다시 열면: 앱이 열리고, 마지막 날씨를 언제 받은 건지와 같이 보여 주는지
// 4. 저장된 날씨가 없을 때 인터넷이 끊기면: 까닭을 보여 주는지
// 5. 인터넷이 다시 연결되면 새 날씨를 받아 오는지
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..'); // QUEST-TRACK-2- 폴더
const PREFIX = '/QUEST-TRACK-2-/';
const PORT = 8606;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const APP = `${ORIGIN}${PREFIX}week-06/`;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };

function startServer() {
  const server = createServer(async (req, res) => {
    let path = decodeURIComponent(new URL(req.url, ORIGIN).pathname);
    if (!path.startsWith(PREFIX)) { res.writeHead(404); return res.end(); }
    if (path.endsWith('/')) path += 'index.html';
    const file = resolve(ROOT, path.slice(PREFIX.length));
    if (!file.startsWith(ROOT + sep)) { res.writeHead(403); return res.end(); }
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
      res.end(body);
    } catch { res.writeHead(404); res.end(); }
  });
  return new Promise(r => server.listen(PORT, '127.0.0.1', () => r(server)));
}

export default async function ({ ev, shot, sleep, waitUntil, log, send }) {
  const screenText = () => ev(`document.querySelector('main').innerText.replace(/\\s+/g, ' ').trim()`);
  const go = async url => { await send('Page.navigate', { url }); await sleep(500); };
  const reload = async () => { await send('Page.reload', {}); await sleep(500); };
  const done = `['ok','saved','error'].includes(window.appState)`;
  const offline = on => send('Network.emulateNetworkConditions',
    { offline: on, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });

  await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  // 지난번 확인 때 남은 서비스 워커·저장 정보를 지우고 처음부터
  await send('Storage.clearDataForOrigin', { origin: ORIGIN, storageTypes: 'all' });

  let server = await startServer();
  log('주소:', APP);

  // 1~2. 처음 열기
  await go(APP);
  await waitUntil(done, 12000);
  log('[처음 열기] 상태:', await ev('window.appState'), '/ 화면 글자:', await screenText());
  await waitUntil(`window.swState !== 'none'`, 8000);
  log('  서비스 워커:', await ev('window.swState'));

  const manifest = await send('Page.getAppManifest');
  const m = manifest.result || {};
  log('  manifest:', m.url || '없음', m.errors?.length ? '문제: ' + JSON.stringify(m.errors) : '문제 없음');
  const icons = await ev(`(async () => {
    const m = await (await fetch('manifest.webmanifest')).json();
    const out = [];
    for (const i of m.icons) {
      const r = await fetch(i.src);
      const img = await createImageBitmap(await r.blob());
      out.push(i.src + ' ' + i.purpose + ' ' + r.status + ' ' + img.width + 'x' + img.height + ' (적힌 크기 ' + i.sizes + ')');
    }
    return out;
  })()`);
  log('  아이콘:\n   ', icons.join('\n    '));
  const inst = await send('Page.getInstallabilityErrors');
  const errs = inst.result?.installabilityErrors || [];
  log('  설치 가능 검사:', errs.length ? '문제: ' + errs.map(e => e.errorId).join(', ') : '문제 없음 (설치할 수 있음)');
  await shot('1-처음열기');

  // 서비스 워커가 이 화면을 맡도록 한 번 더 열기
  await reload();
  await waitUntil(done, 12000);
  log('  서비스 워커가 화면을 맡음:', await ev('!!navigator.serviceWorker.controller'));

  // 3. 서버를 끄고 인터넷도 끊고 다시 열기
  await new Promise(r => server.close(r));
  await offline(true);
  await reload();
  await waitUntil(done, 12000);
  log('[서버 끄고 인터넷 끊김] 상태:', await ev('window.appState'), '/ 화면 글자:', await screenText());
  await shot('2-인터넷끊김-저장된날씨');

  // 4. 저장된 날씨가 없을 때 인터넷 끊김
  await ev(`localStorage.clear()`);
  await reload();
  await waitUntil(done, 12000);
  log('[저장된 날씨 없음 + 끊김] 상태:', await ev('window.appState'), '/ 화면 글자:', await screenText());
  await shot('3-인터넷끊김-저장없음');

  // 5. 다시 연결
  server = await startServer();
  await offline(false);
  await waitUntil(`window.appState === 'ok'`, 12000);
  log('[다시 연결] 상태:', await ev('window.appState'), '/ 화면 글자:', await screenText());
  await shot('4-다시연결');

  await send('Emulation.setDeviceMetricsOverride', { width: 320, height: 568, deviceScaleFactor: 1, mobile: true });
  await offline(true);
  await reload();
  await waitUntil(done, 12000);
  const wide = await ev(`document.documentElement.scrollWidth > document.documentElement.clientWidth`);
  log('[작은 폰 + 끊김] 상태:', await ev('window.appState'), '/ 옆으로 넘침:', wide);
  await shot('5-작은폰-끊김');
  await offline(false);
  await new Promise(r => server.close(r));
}
