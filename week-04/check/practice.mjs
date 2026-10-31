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
  const before = await ev('JSON.stringify(berries.map(b => [b.x, b.y]))');
  await tap('KeyR'); await sleep(200);
  log('R 누른 뒤 딸기:', await ev('score'), '/', await ev('berries.length'));
  log('R 누른 뒤 딸기 자리가 바뀜:', before !== await ev('JSON.stringify(berries.map(b => [b.x, b.y]))'));
  await shot('09-after-r');

  // 무작위로 300번 뿌려 보고 문제가 있는지 셈
  log('무작위 300번:', await ev(`(() => {
    let wrongCount = 0, inGround = 0, touching = 0, nearStart = 0, underScore = 0;
    const layouts = new Set();
    for (let n = 0; n < 300; n++) {
      resetBerries();
      if (berries.length !== BERRY_COUNT) wrongCount++;
      const t = berries.map(b => [(b.x - 8) / 16, (b.y - 8) / 16]);
      t.forEach(([x, y], i) => {
        if (isSolid(x, y)) inGround++;
        if (x <= 5 && y <= 1) underScore++;
        if (Math.abs(x - startPos.x / 16) <= 2 && Math.abs(y - (startPos.y / 16 - 1)) <= 2) nearStart++;
        t.forEach(([x2, y2], j) => { if (j > i && Math.abs(x - x2) < 2 && Math.abs(y - y2) < 2) touching++; });
      });
      layouts.add(JSON.stringify(t));
    }
    resetBerries();
    return '15개가 아님 ' + wrongCount + '번, 땅 속 ' + inGround + '개, 서로 붙음 ' + touching + '쌍, 시작 자리 옆 ' + nearStart + '개, 점수 글자 밑 ' + underScore + '개, 서로 다른 배치 ' + layouts.size + '가지';
  })()`));
};
