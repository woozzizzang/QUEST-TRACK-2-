// 별 잡기 랭킹(week-07/index.html) 확인 시나리오
//   node week-07/check/run.mjs week-07/index.html week-07/check/ranking.mjs
// 1. 로그인 자리 글자  2. 한 판 끝까지(별 누르기 → 점수 → 저장)  3. 새로 열어도 기록이 남는지
// 4. 난이도별 랭킹이 따로 나뉘는지  5. 폭마다 옆으로 넘치거나 잘리는지, 가장 작은 글자
export default async ({ ev, shot, sleep, waitUntil, log, send }) => {
  const resize = (w, h) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 800 });
  await ev(`localStorage.removeItem(Store.KEY); drawLevels(); drawRanking(); true`);
  log('로그인 자리:', await ev(`document.getElementById('login-slot').textContent`));
  log('로그인 단추(button/a) 개수 (0 이어야 함):', await ev(`document.querySelectorAll('header button, header a').length`));

  const fit = () => ev(`(() => {
    const w = document.documentElement.clientWidth;
    const bad = [...document.querySelectorAll('body *')].filter(e => { if (e.closest('[hidden]')) return false; const r = e.getBoundingClientRect(); return r.width && (r.right > w + 1 || r.left < -1); }).map(e => e.id || e.className);
    let min = 99; const wk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n; (n = wk.nextNode());) { if (!n.textContent.trim()) continue; const el = n.parentElement; if (el.closest('[hidden],script,style') || !el.getBoundingClientRect().width) continue; min = Math.min(min, parseFloat(getComputedStyle(el).fontSize)); }
    return '폭 ' + w + ' · 넘침 ' + (bad.length ? bad.join(',') : '없음') + ' · 가장 작은 글자 ' + min + 'px · 가로 스크롤 ' + (document.documentElement.scrollWidth > w);
  })()`);

  // 한 판 (보통): 시작 → 별이 나오면 눌러서 점수
  await resize(1100, 800);
  await ev(`document.getElementById('start-btn').click(); true`);
  log('시작 직후 상태:', await ev('state'));
  await waitUntil(`state === 'play'`, 5000);
  let clicked = 0;
  for (let i = 0; i < 12; i++) {
    await sleep(300);
    clicked += await ev(`(() => { let n = 0; for (const s of document.querySelectorAll('.star')) { s.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true })); n++; } return n; })()`);
  }
  log('누른 별:', clicked, '/ 화면 점수:', await ev(`document.getElementById('score').textContent`));
  log('잡은 뒤 떠오르는 +1:', await ev(`document.querySelectorAll('.plus').length`), '개 · 점수 숫자 bump:', await ev(`document.getElementById('score').classList.contains('bump')`));
  await shot('01-play-pc');
  await sleep(1000);
  log('1초 뒤 남은 +1 (마지막 클릭 이후 정리돼야 함):', await ev(`document.querySelectorAll('.plus').length`));
  log('별 위치가 판 안인가:', await ev(`[...document.querySelectorAll('.star')].every(s => { const f = document.getElementById('field').getBoundingClientRect(), r = s.getBoundingClientRect(); return r.left >= f.left && r.right <= f.right && r.top >= f.top && r.bottom <= f.bottom; })`));
  await waitUntil(`state === 'result'`, 40000);
  log('결과:', await ev(`document.getElementById('result-score').textContent + ' / ' + document.getElementById('result-note').textContent`));
  log('저장된 기록(보통):', await ev(`JSON.stringify(Store.top('normal').map(r => r.score))`));
  log('쉬움·어려움 기록(비어 있어야 함):', await ev(`Store.top('easy').length + ', ' + Store.top('hard').length`));
  await shot('02-result-pc');
  log(await fit());

  // 새로 열어도 남아 있나
  await send('Page.reload');
  await sleep(1200);
  log('다시 열었을 때 보통 최고점:', await ev(`Store.best('normal')`), '/ 랭킹 줄 수:', await ev(`document.querySelectorAll('#rank-list li').length`));
  log('보통 단추 글자:', await ev(`document.querySelectorAll('.level')[1].textContent`));

  // 난이도 바꾸기 → 랭킹 탭이 따라 바뀜, 별 생김새는 어려움이 더 빨리 사라짐
  await ev(`document.querySelectorAll('.level')[2].click(); true`);
  log('어려움 고르면 랭킹 탭:', await ev(`document.querySelector('.tab[aria-selected="true"]').textContent`), '/ 빈 안내:', await ev(`!document.getElementById('rank-empty').hidden`));

  // 10개 넘게 쌓아도 10개만
  await ev(`for (let i = 1; i <= 12; i++) Store.add('easy', i); Store.top('easy').length`);
  log('쉬움 12번 저장 후 줄 수(10):', await ev(`Store.top('easy').length`), '/ 1등 점수(12):', await ev(`Store.best('easy')`));

  // 0점은 기록으로 남지 않아야 함
  await ev(`level = 'hard'; rankLevel = 'hard'; startGame(); true`);
  await waitUntil(`state === 'play'`, 5000);
  await ev('endGame(); true');
  log('0점 판 후 어려움 기록 수(0):', await ev(`Store.top('hard').length`), '/ 안내:', await ev(`document.getElementById('result-score').textContent + ' · ' + document.getElementById('result-note').textContent`));
  await shot('02b-zero-result');

  // 그만두기: 카운트다운 중 · 놀이 중 모두 점수 저장 없이 시작 화면으로, 그 뒤 새 판이 정상 시작
  await ev(`level = 'hard'; startGame(); true`);
  await sleep(500);
  await ev(`document.getElementById('quit-btn').click(); true`);
  await sleep(3000);
  log('카운트다운 중 그만두기 → 상태(start):', await ev('state'), '/ 시작 화면 보임:', await ev(`!document.getElementById('screen-start').hidden && document.getElementById('screen-play').hidden`));
  await ev(`startGame(); true`);
  await waitUntil(`state === 'play'`, 5000);
  await sleep(500);
  await ev(`document.querySelectorAll('.star').forEach(s => s.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }))); document.getElementById('quit-btn').click(); true`);
  await sleep(2500);
  log('놀이 중 그만두기 → 상태(start):', await ev('state'), '/ 남은 별·+1 (0):', await ev(`document.querySelectorAll('.star, .plus').length`), '/ 어려움 기록 수(0):', await ev(`Store.top('hard').length`), '/ 시간 표시:', await ev(`document.getElementById('time').textContent`));
  await shot('02c-after-quit');
  await ev(`startGame(); true`);
  await waitUntil(`state === 'play'`, 5000);
  log('그만둔 뒤 새 판 시작 → 상태:', await ev('state'));
  await ev(`quitGame(); true`);

  // 폰 · 작은 폰 · 어두운 화면
  for (const [w, h, name] of [[390, 800, 'phone'], [320, 640, 'small']]) {
    await resize(w, h);
    await ev(`document.getElementById('home-btn') && show('screen-start'); drawLevels(); drawRanking(); true`);
    await sleep(300);
    await shot('03-start-' + name);
    log(await fit());
    await ev(`startGame(); true`);
    await waitUntil(`state === 'play'`, 5000);
    await sleep(700);
    await shot('04-play-' + name);
    log('놀이 중 ' + await fit());
    await ev(`endGame(); true`);
    await shot('05-result-' + name);
  }
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
  await shot('06-dark');
};
