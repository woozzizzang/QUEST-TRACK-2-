// 연습 게임(딸기 모으기) 확인 시나리오
//   node week-04/check/run.mjs week-04/practice/index.html week-04/check/practice.mjs
export default async ({ ev, down, up, tap, shot, sleep, waitUntil, log }) => {
  log('그림:', await ev(`Object.entries(images).map(([k, i]) => k + ' ' + i.naturalWidth + 'x' + i.naturalHeight).join(', ')`));
  log('소리 오류:', await ev(`JSON.stringify(soundErrors)`));
  log('소리 상태:', await ev(`Object.entries(sounds).map(([k, a]) => k + ' ready=' + a.readyState + ' 길이=' + a.duration?.toFixed(2)).join(', ')`));
  await shot('01-start');

  await tap('Space');                       // 시작
  await sleep(600);
  log('시작 후 배경음악:', await ev(`'멈춤=' + sounds.bgm.paused + ' 재생위치=' + sounds.bgm.currentTime.toFixed(2)`));

  // 매 화면마다 가장 높이 간 곳과 나온 애니메이션을 기록
  await ev(`window.__rec = { minY: 1e9, anims: new Set() };
    (function r() { __rec.minY = Math.min(__rec.minY, p.y); __rec.anims.add(p.anim); requestAnimationFrame(r); })(); true`);
  const groundY = await ev('p.y');

  await tap('Space'); await sleep(150); await shot('02-jump'); await sleep(900);
  log('한 번 점프 높이(px):', Math.round(groundY - await ev('__rec.minY')));

  await ev('__rec.minY = 1e9; true');
  await tap('Space'); await sleep(250); await tap('Space'); await sleep(60); await shot('03-double'); await sleep(1200);
  log('2단 점프 높이(px):', Math.round(groundY - await ev('__rec.minY')));

  // 오른쪽으로 달려서 구덩이 앞에서 점프
  await down('ArrowRight'); await sleep(300); await shot('04-run');
  await waitUntil('p.x >= 11 * 16 - BODY.w - 2');
  await tap('Space');
  await sleep(200); await shot('05-over-pit');
  await sleep(2500);
  await up('ArrowRight');
  log('오른쪽 끝까지 간 뒤 x:', Math.round(await ev('p.x')), '딸기:', await ev('score'), '상태:', await ev('p.state'));

  // 오른쪽 벽에 붙어 미끄러지기
  await down('ArrowRight'); await tap('Space'); await sleep(450); await shot('06-wall'); await sleep(600); await up('ArrowRight');
  log('나온 애니메이션:', await ev('[...__rec.anims].join(", ")'));

  // 구덩이에 빠지기
  await ev('p.x = 13 * 16; p.y = 200; p.vy = 0; true');
  await sleep(250); await shot('07-hit');
  log('빠진 뒤 상태:', await ev('p.state'));
  await sleep(800);
  log('조금 뒤 상태:', await ev('p.state'), '위치:', await ev('[Math.round(p.x), Math.round(p.y)].join(",")'));

  // 다 모은 화면과 R
  await ev('berries.forEach(b => b.taken = true); true'); await tap('ArrowLeft'); await sleep(200);
  await shot('08-win');
  await tap('KeyR'); await sleep(200);
  log('R 누른 뒤 딸기:', await ev('score'), '/', await ev('berries.length'));
};
