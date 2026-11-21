// 움직이는 온도계 확인 시나리오
// 쓰는 법 (QUEST-TRACK-2- 폴더에서):
//   node week-06/check/run.mjs week-06/index.html week-06/check/thermo.mjs
//
// 1. 열리면 액체가 바닥에서 지금 기온까지 차오르는지, 색이 기온에 맞는지, 최고·최저 표시가 있는지
// 2. 손가락으로 누르면: 통 튀고 거품이 나오고 말풍선이 뜨는지
// 3. 위아래로 끌면 액체가 손가락을 따라오는지, 화면이 같이 밀리지 않는지
// 4. 손을 떼면 지금 기온으로 돌아가는지, 말풍선이 사라지는지
// 5. 화면 폭마다 잘리지 않는지 (말풍선 포함), 저장된 날씨(인터넷 끊김)에서도 온도계가 나오는지
export default async function ({ ev, shot, sleep, waitUntil, log, send }) {
  const resize = (w, h) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 800 });
  const reload = async () => { await send('Page.reload', { ignoreCache: true }); await sleep(300); };
  const st = () => ev(`(() => { const s = window.thermoState; return {
    기온: s.temp, 액체: +s.level.toFixed(2), 목표: +s.target.toFixed(2), 속도: +s.vel.toFixed(1), 출렁임: +s.amp.toFixed(2),
    거품: s.bubbles.length, 색: document.getElementById('thermoLiquid').getAttribute('fill'),
    말풍선: document.getElementById('thermoTip').hidden ? '(숨김)' : document.getElementById('thermoTip').textContent }; })()`);
  const box = () => ev(`(() => { const r = document.getElementById('thermo').getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height }; })()`);
  const overflow = () => ev(`(() => {
    const w = document.documentElement.clientWidth;
    const cut = [...document.querySelectorAll('main *')].filter(el => {
      const r = el.getBoundingClientRect(); return r.width && (r.left < -0.5 || r.right > w + 0.5);
    }).map(el => el.id || el.className?.baseVal || el.className || el.tagName);
    return { 옆으로_넘침: document.documentElement.scrollWidth > w, 잘린것: cut.slice(0, 5) };
  })()`);
  const touch = (type, x, y) => send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });

  await resize(390, 844);
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  await reload();
  await waitUntil(`window.appState === 'ok' || window.appState === 'saved' || window.appState === 'error'`, 12000);
  log('상태:', await ev('window.appState'));

  // 1. 차오르기
  await sleep(150);
  const early = await st();
  log('[열자마자]', JSON.stringify(early));
  await shot('1-차오르는중');
  await sleep(2500);
  const settled = await st();
  log('[2.5초 뒤]', JSON.stringify(settled));
  log('  지금 기온까지 찼나:', Math.abs(settled.액체 - settled.기온) < 0.5 ? '예' : '아니오',
      '/ 처음보다 올라갔나:', settled.액체 > early.액체 ? '예' : '아니오');
  const marks = await ev(`[...document.querySelectorAll('#thermoMarks text')].map(t => t.getAttribute('class') + ' ' + t.textContent)`);
  log('  최고·최저 표시:', marks.join(', '), '/ 화면 숫자:', await ev(`document.getElementById('max').textContent + ' ' + document.getElementById('min').textContent`));
  log('  숫자·날씨 낱말 그대로:', await ev(`document.getElementById('temp').textContent + ' ' + document.getElementById('desc').textContent`));
  await shot('2-다참');

  // 2. 누르기
  const b = await box();
  const cx = b.x + b.w * (30 + 18) / 114; // 유리관 가운데 (viewBox -18 기준)
  const cy = b.y + b.h * 0.5;
  const scroll0 = await ev('window.scrollY');
  await touch('touchStart', cx, cy);
  await sleep(120);
  const pressed = await st();
  log('[누름]', JSON.stringify(pressed));
  log('  통 튐(속도·출렁임 커짐):', pressed.출렁임 > settled.출렁임 + 1 ? '예' : '아니오', '/ 거품:', pressed.거품 > 0 ? '예' : '아니오',
      '/ 말풍선:', pressed.말풍선 !== '(숨김)' ? '예' : '아니오');
  await shot('3-누름');

  // 3. 위로 끌기 (관 위쪽 = 높은 기온)
  for (let k = 1; k <= 8; k++) { await touch('touchMove', cx, cy - (b.h * 0.38) * k / 8); await sleep(30); }
  await sleep(900);
  const up = await st();
  log('[위로 끔]', JSON.stringify(up));
  log('  액체가 손가락을 따라감:', Math.abs(up.액체 - up.목표) < 1.5 && up.목표 > settled.기온 + 10 ? '예' : '아니오',
      '/ 색이 바뀜:', up.색 !== settled.색 ? `예 (${settled.색} → ${up.색})` : '아니오');
  await shot('4-위로끔');
  // 아래로 끌기
  for (let k = 1; k <= 8; k++) { await touch('touchMove', cx, cy - b.h * 0.38 + b.h * 0.55 * k / 8); await sleep(30); }
  await sleep(900);
  const down = await st();
  log('[아래로 끔]', JSON.stringify(down));
  log('  화면이 같이 밀렸나:', (await ev('window.scrollY')) !== scroll0 ? '예 (문제)' : '아니오');
  await overflow().then(o => log('  말풍선 뜬 채 잘림 검사:', JSON.stringify(o)));

  // 4. 떼기
  await touch('touchEnd');
  await sleep(1500);
  const back = await st();
  log('[뗌 1.5초 뒤]', JSON.stringify(back));
  log('  지금 기온으로 돌아옴:', Math.abs(back.액체 - back.기온) < 0.5 ? '예' : '아니오');
  await sleep(1500);
  log('  3초 뒤 말풍선:', (await st()).말풍선);

  // 짧게 톡 누르기
  await touch('touchStart', cx, cy); await sleep(60); await touch('touchEnd');
  await sleep(100);
  log('[톡 누름]', JSON.stringify(await st()));

  // 5. 화면 폭
  for (const [w, h] of [[1100, 700], [390, 844], [320, 568]]) {
    await resize(w, h);
    await sleep(300);
    const bb = await box();
    await touch('touchStart', bb.x + bb.w * 48 / 114, bb.y + bb.h * 0.4);
    await sleep(200);
    log(`[${w}x${h}] 온도계 ${Math.round(bb.w)}x${Math.round(bb.h)} / 말풍선 뜬 채 잘림 검사:`, JSON.stringify(await overflow()));
    await shot(`5-폭-${w}`);
    await touch('touchEnd');
    await sleep(200);
  }

  // 인터넷 끊김 → 저장된 날씨에서도 온도계
  await resize(390, 844);
  await send('Network.enable');
  await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await reload();
  await waitUntil(`['ok','saved','error'].includes(window.appState)`, 12000);
  await sleep(2500);
  log('[인터넷 끊김] 상태:', await ev('window.appState'), JSON.stringify(await st()));
  await shot('6-끊김-저장된날씨');
  await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
}
