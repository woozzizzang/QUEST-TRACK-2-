// 날씨 앱 확인 시나리오
// 쓰는 법 (QUEST-TRACK-2- 폴더에서):
//   node week-06/check/run.mjs week-06/index.html week-06/check/weather.mjs
//
// 1. 컴퓨터·폰·작은 폰 화면 폭에서 진짜 날씨를 받아 와 보이는지, 옆으로 잘리지 않는지
// 2. 불러오는 동안 화면
// 3. 못 받아 왔을 때(연결 끊김 / 서버 오류 / 이상한 답) 까닭이 보이는지, 다시 불러오기가 되는지
export default async function ({ ev, shot, sleep, waitUntil, log, send, on }) {
  const SIZES = [
    ['컴퓨터', 1100, 700, false],
    ['폰', 390, 844, true],
    ['작은폰', 320, 568, true],
  ];
  const screenText = () => ev(`document.querySelector('main').innerText.replace(/\\s+/g, ' ').trim()`);
  const overflow = () => ev(`(() => {
    const w = document.documentElement.clientWidth;
    const wide = document.documentElement.scrollWidth > w;
    const cut = [...document.querySelectorAll('main *')].some(el => {
      const r = el.getBoundingClientRect(); return r.width && (r.left < 0 || r.right > w + 0.5);
    });
    return { 옆으로_넘침: wide, 잘린_글자: cut };
  })()`);
  const resize = (w, h, mobile) => send('Emulation.setDeviceMetricsOverride',
    { width: w, height: h, deviceScaleFactor: 1, mobile });
  const reload = async () => { await send('Page.reload', { ignoreCache: true }); await sleep(300); };

  // 1. 화면 폭마다 진짜 날씨
  for (const [name, w, h, mobile] of SIZES) {
    await resize(w, h, mobile);
    await reload();
    const ok = await waitUntil(`window.appState === 'ok' || window.appState === 'error'`, 12000);
    const state = await ev('window.appState');
    log(`[${name} ${w}x${h}] 상태: ${ok ? state : '시간 초과'}`);
    log('  화면 글자:', await screenText());
    log('  잘림 검사:', JSON.stringify(await overflow()));
    await shot(`1-${name}`);
  }

  // 2~3. 날씨 서버로 가는 요청을 가로채서 여러 경우를 흉내 냄 (폰 화면에서)
  await resize(390, 844, true);
  let mode = 'hold';
  const held = [];
  on('Fetch.requestPaused', p => {
    if (mode === 'hold') held.push(p.requestId);
    else if (mode === 'fail') send('Fetch.failRequest', { requestId: p.requestId, errorReason: 'InternetDisconnected' });
    else if (mode === 'server500' || mode === 'baddata') {
      const body = mode === 'baddata' ? '{"oops":true}' : 'error';
      send('Fetch.fulfillRequest', {
        requestId: p.requestId, responseCode: mode === 'baddata' ? 200 : 500,
        responseHeaders: [{ name: 'Access-Control-Allow-Origin', value: '*' }, { name: 'Content-Type', value: 'application/json' }],
        body: Buffer.from(body).toString('base64'),
      });
    }
  });
  await send('Fetch.enable', { patterns: [{ urlPattern: '*api.open-meteo.com*' }] });

  // 2. 불러오는 중 (답을 붙잡아 둠)
  mode = 'hold';
  await reload();
  await sleep(500);
  log('[불러오는 중] 상태:', await ev('window.appState'), '/ 화면 글자:', await screenText());
  await shot('2-불러오는중');
  // 붙잡아 둔 요청을 끊긴 것으로 처리
  for (const requestId of held) await send('Fetch.failRequest', { requestId, errorReason: 'InternetDisconnected' });

  // 3. 실패한 경우들
  for (const [m, label] of [['fail', '연결끊김'], ['server500', '서버오류'], ['baddata', '이상한답']]) {
    mode = m;
    await reload();
    await waitUntil(`window.appState === 'error' || window.appState === 'ok'`, 12000);
    log(`[${label}] 상태:`, await ev('window.appState'), '/ 화면 글자:', await screenText());
    await shot(`3-${label}`);
  }

  // 4. 다시 불러오기 버튼 (이제 진짜 서버로 보냄)
  await send('Fetch.disable');
  await ev(`document.getElementById('retry').click()`);
  await waitUntil(`window.appState === 'ok' || window.appState === 'error'`, 12000);
  log('[다시 불러오기] 상태:', await ev('window.appState'), '/ 화면 글자:', await screenText());
  await shot('4-다시불러오기');
}
