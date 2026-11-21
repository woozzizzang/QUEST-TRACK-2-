// 날씨 카드 배틀 확인 시나리오
// 쓰는 법 (QUEST-TRACK-2- 폴더에서):
//   node week-06/check/run.mjs week-06/battle.html week-06/check/battle.mjs
//
// 1. 한글 이름(수원, 강남)과 영어 이름(Suwon)으로 친구 동네를 찾는지, 같은 이름이 여럿이면 지역과 같이 나오는지
// 2. 카드에 공격력(기온)·방어력(바람)·체력(습도)이 맞게 들어가는지, 화면 폭마다 잘리지 않는지
// 3. 배틀: 번갈아 공격, 데미지 숫자가 튀어 오름, 체력 막대가 줄어듦, 이긴 쪽 승리 효과
//    그리고 규칙대로 계산한 승자와 화면의 승자가 같은지
// 4. 못 찾았을 때 / 지명 서버가 안 될 때 / 날씨 서버가 안 될 때 까닭이 보이는지
export default async function ({ ev, shot, sleep, waitUntil, log, send, on }) {
  const resize = (w, h) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 800 });
  const settled = `!['searching','loading'].includes(window.battleState)`;
  const msg = () => ev(`document.getElementById('searchMsg').hidden ? '' : document.getElementById('searchMsg').innerText`);
  const search = async q => {
    await ev(`document.getElementById('q').value = ${JSON.stringify(q)}; document.getElementById('searchForm').requestSubmit()`);
    await sleep(100);
    await waitUntil(settled, 30000);
    const list = await ev(`[...document.querySelectorAll('#results button')].map(b => b.innerText.replace(/\\n/g, ' · '))`);
    return { state: await ev('window.battleState'), msg: await msg(), list };
  };
  const overflow = () => ev(`(() => {
    const w = document.documentElement.clientWidth;
    const cut = [...document.querySelectorAll('.wrap *')].filter(el => {
      if (el.closest('.dmg, .crown')) return false;
      const r = el.getBoundingClientRect(); return r.width && (r.left < -0.5 || r.right > w + 0.5);
    }).map(el => el.className || el.tagName);
    return { 옆으로_넘침: document.documentElement.scrollWidth > w, 잘린것: cut.slice(0, 5) };
  })()`);

  await resize(390, 844);

  // 1. 찾기
  for (const q of ['수원', 'Suwon', '강남']) {
    const r = await search(q);
    log(`[찾기 "${q}"] 상태: ${r.state} / ${r.msg}`);
    r.list.slice(0, 4).forEach(x => log('   ·', x));
  }
  await shot('1-찾기결과-강남');

  // 수원으로 배틀 준비
  await search('수원');
  await ev(`document.querySelector('#results button').click()`);
  await sleep(100);
  await waitUntil(settled, 20000);
  log('[수원 고름] 상태:', await ev('window.battleState'), (await msg()) || '');
  const F = await ev('window.battleFighters');
  if (!F) { log('카드를 만들지 못해서 여기서 멈춤'); return; }
  for (const f of F) {
    const okAtk = f.atk === Math.max(1, Math.round(f.temp + 20));
    const okDef = f.def === Math.max(0, Math.round(f.wind));
    const okHp = f.maxHp === Math.max(1, Math.round(f.humidity));
    log(`  ${f.who} ${f.name} (${f.region}): 기온 ${f.temp}° → 공격 ${f.atk} ${okAtk ? '맞음' : '틀림'}, `
      + `바람 ${f.wind} → 방어 ${f.def} ${okDef ? '맞음' : '틀림'}, 습도 ${f.humidity}% → 체력 ${f.maxHp} ${okHp ? '맞음' : '틀림'}`);
  }
  for (const [w, h] of [[1100, 700], [390, 844], [320, 568]]) {
    await resize(w, h);
    await sleep(200);
    log(`  [${w}x${h}] 잘림 검사:`, JSON.stringify(await overflow()));
    await shot(`2-배틀준비-${w}`);
  }

  // 규칙대로 미리 계산한 승자
  const sim = F.map(f => ({ ...f, hp: f.maxHp }));
  let t = sim[1].atk > sim[0].atk ? 1 : 0;
  const expectHits = [];
  for (let k = 0; k < 200; k++) {
    const dmg = Math.max(1, Math.round(sim[t].atk - sim[1 - t].def / 2));
    sim[1 - t].hp = Math.max(0, sim[1 - t].hp - dmg);
    expectHits.push(dmg);
    if (sim[1 - t].hp <= 0) break;
    t = 1 - t;
  }
  const expectWinner = sim[t].name;

  // 3. 배틀 (390 폭, 2배 빠르게)
  await resize(390, 844);
  await ev(`window.battleSpeed = 2; window.lastDamagePop = null; document.getElementById('startBtn').click()`);
  await waitUntil(`window.lastDamagePop !== null && document.querySelector('.dmg')`, 5000);
  await sleep(120);
  const mid = await ev(`({ 데미지숫자: [...document.querySelectorAll('.dmg')].map(d => d.textContent),
    체력막대: [...document.querySelectorAll('.hpfill')].map(e => e.style.width) })`);
  log('[배틀 중] 튀어 오른 숫자:', mid.데미지숫자.join(', '), '/ 체력 막대:', mid.체력막대.join(', '));
  await shot('3-배틀중');
  // 번갈아 공격하는지
  await waitUntil(`window.battleLog.length >= 3 || window.battleState === 'done'`, 8000);
  const firstLines = await ev('window.battleLog.slice(0, 4)');
  log('  처음 기록:', firstLines.join(' | '));
  await waitUntil(`window.battleState === 'done'`, 60000);
  await sleep(300);
  const end = await ev(`({
    승자: window.battleWinner,
    결과글: document.getElementById('result').innerText,
    승리카드: [...document.querySelectorAll('.fighter.winner .name')].map(e => e.textContent),
    왕관: !!document.querySelector('.fighter.winner .crown'),
    색종이: document.querySelectorAll('.confetti i').length,
    진카드_회색: !!document.querySelector('.fighter.loser'),
    체력막대: [...document.querySelectorAll('.hpfill')].map(e => e.style.width),
    체력글: [...document.querySelectorAll('.hptext')].map(e => e.textContent),
    공격횟수: window.battleLog.filter(l => l.includes('🗡️')).length,
    버튼: document.getElementById('startBtn').textContent,
  })`);
  log('[배틀 끝]', JSON.stringify(end));
  log(`  규칙으로 계산한 승자: ${expectWinner} (공격 ${expectHits.length}번) → 화면과 ${end.승자 === expectWinner && end.공격횟수 === expectHits.length ? '같음' : '다름!'}`);
  await shot('4-승리');

  // 다시 하기
  await ev(`window.battleSpeed = 20; document.getElementById('startBtn').click()`);
  await sleep(100);
  log('[다시 하기] 체력 다시 참:', JSON.stringify(await ev(`[...document.querySelectorAll('.hptext')].map(e => e.textContent)`)));
  await waitUntil(`window.battleState === 'done'`, 30000);
  log('  다시 한 판 승자:', await ev('window.battleWinner'));

  // 4. 실패한 경우들
  const r1 = await search('ㅋㅋzzqqxx없는동네');
  log('[없는 동네] 상태:', r1.state, '/', r1.msg);

  let mode = '';
  on('Fetch.requestPaused', p => {
    if (mode === 'geo-down' && p.request.url.includes('geocoding')) {
      send('Fetch.failRequest', { requestId: p.requestId, errorReason: 'ConnectionRefused' });
    } else if (mode === 'wx-500' && p.request.url.includes('/v1/forecast')) {
      send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 500,
        responseHeaders: [{ name: 'Access-Control-Allow-Origin', value: '*' }], body: '' });
    } else send('Fetch.continueRequest', { requestId: p.requestId });
  });
  await send('Fetch.enable', { patterns: [{ urlPattern: '*open-meteo.com*' }] });

  mode = 'geo-down';
  const r2 = await search('수원');
  log('[지명 서버 안 됨] 상태:', r2.state, '/', r2.msg);
  await shot('5-지명서버안됨');

  mode = 'wx-500';
  const r3 = await search('Suwon');
  await ev(`document.querySelector('#results button').click()`);
  await sleep(100);
  await waitUntil(settled, 20000);
  log('[날씨 서버 오류] 상태:', await ev('window.battleState'), '/', await msg(), '/ 배틀 화면 숨김:', await ev(`document.getElementById('battle').hidden`));
  await shot('6-날씨서버오류');
  await send('Fetch.disable');
}
