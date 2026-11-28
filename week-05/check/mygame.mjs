// 내 게임(숲속 금화 모으기) 확인 시나리오
//   node week-05/check/run.mjs week-05/index.html week-05/check/mygame.mjs
// 슬라임 4색이 다 나오는 3스테이지(깊은 숲)에서 확인함. 스테이지 넘어가기는 mygame-stages.mjs 에서 따로 확인
export default async ({ ev, down, up, tap, shot, sleep, waitUntil, log }) => {
  await ev('loadStage(2); localStorage.removeItem(bestKey()); bestTime = null; true');   // 지난번 확인 때 남은 기록을 지우고 시작
  log('그림 수:', await ev('Object.keys(images).length'), '/', await ev('Object.keys(IMAGE_FILES).length'));
  log('크기가 다른 그림:', await ev(`(() => {
    const want = { 'bg-back': [160, 272], 'bg-middle': [384, 272], 'ground': [176, 96] };
    const bad = [];
    for (const [k, img] of Object.entries(images)) {
      const name = k.split('-').slice(1).join('-');
      const [w, h] = want[k] || (k.startsWith('hero-') ? [HERO_ANIMS[name].frames * HERO_FW, HERO_FH]
                                                       : [SLIME_ANIMS[name].frames * 32, 32]);
      if (img.naturalWidth !== w || img.naturalHeight !== h) bad.push(k + ' ' + img.naturalWidth + 'x' + img.naturalHeight);
    }
    return bad.length ? bad.join(', ') : '없음';
  })()`));
  log('소리 오류:', await ev('JSON.stringify(soundErrors)'));
  log('소리 상태:', await ev(`Object.entries(sounds).map(([k, a]) => k + ' ready=' + a.readyState + ' 길이=' + a.duration?.toFixed(2)).join(', ')`));
  await shot('01-start');

  await tap('Space');
  await sleep(500);
  log('시작 후 배경음악:', await ev(`'멈춤=' + sounds.bgm.paused + ' 재생위치=' + sounds.bgm.currentTime.toFixed(2)`));
  log('처음: 금화', await ev('coins.length'), '개, 하트', await ev('knight.lives'), ', 상태', await ev('state'));
  await shot('02-play');

  // 시작 직후 보호: 2초 안에는 슬라임에 닿아도 하트가 줄지 않고, 빨강도 달려들지 않음
  await ev('knight.x = slimes[0].x - 6; knight.y = GROUND_TOP - KB.h; true');
  await sleep(300);
  log('시작 직후 초록 슬라임에 닿음: 하트', await ev('knight.lives'), '/ 남은 보호(초)', (await ev('knight.safe')).toFixed(1));
  await shot('02b-start-safe');
  await ev('knight.x = slimes[3].x - 45; knight.y = GROUND_TOP - KB.h; true');
  await sleep(400);
  log('시작 직후 빨강 슬라임 옆: 빨강 동작', await ev('slimes[3].anim'), '/ 하트', await ev('knight.lives'));
  await waitUntil('knight.safe <= 0', 3000);
  await ev('knight.x = slimes[0].x - 6; knight.y = GROUND_TOP - KB.h; true');   // 보호가 끝난 뒤 슬라임 위에 올려 둠
  await sleep(100);
  log('보호가 끝난 뒤 초록 슬라임에 닿음: 하트', await ev('knight.lives'), '/ 시작 후 시간', await ev('playTime.toFixed(1)'));
  await tap('KeyR'); await sleep(100);
  log('R 뒤 보호 다시 시작:', (await ev('knight.safe')) > 1.5);

  // 점프 높이
  const groundY = await ev('knight.y');
  await ev(`window.__minY = 1e9; (function r() { __minY = Math.min(__minY, knight.y); requestAnimationFrame(r); })(); true`);
  await tap('Space'); await sleep(100);
  const jumpAnim = await ev('knight.anim');
  await sleep(100); await shot('03-jump'); await sleep(700);
  log('점프 높이(px):', Math.round(groundY - await ev('__minY')), '/ 착지:', await ev('knight.onGround'),
      '/ 점프 중 기사 동작:', jumpAnim, '/ 착지 후 동작:', await ev('knight.anim'));

  // 입력 버퍼: 땅에 닿기 조금 전(약 0.1초)에 누른 점프는 받아 주고, 너무 일찍(약 0.4초 전) 누른 건 받지 않음
  await ev(`window.__jumped = false; (function r() { if (knight.vy < -250) __jumped = true; requestAnimationFrame(r); })(); true`);
  await ev('knight.y = GROUND_TOP - KB.h - 6; knight.vy = 0; knight.onGround = false; true');   // 6px 위에서 떨어뜨림
  await tap('Space'); await sleep(500);
  const early = await ev('__jumped');
  await ev('__jumped = false; knight.y = GROUND_TOP - KB.h - 60; knight.vy = 0; knight.onGround = false; true');   // 60px 위
  await tap('Space'); await sleep(700);
  log('입력 버퍼: 닿기 직전에 누른 점프', early ? '받아 줌' : '버려짐',
      '/ 너무 일찍 누른 점프', (await ev('__jumped')) ? '받아 줌(잘못)' : '버려짐', '/ 착지:', await ev('knight.onGround'));

  // 첫 금화 줍기 (오른쪽으로 걸어가면 땅 위 금화가 있음)
  await down('ArrowRight');
  await sleep(150);
  log('달릴 때 기사 동작:', await ev('knight.anim'), '/ 보는 방향:', await ev('knight.face'));
  await shot('03b-run');
  await waitUntil('coins[0].taken', 3000);
  log('걸어가서 첫 금화:', await ev('coins[0].taken'), '→ 금화', await ev('coins.filter(c => c.taken).length'));

  // 계속 걸어서 초록 슬라임에 부딪히기
  const hit = await waitUntil('knight.lives < 3', 8000);
  await up('ArrowRight');
  await sleep(100);                      // 슬라임 동작은 부딪힌 다음 장면부터 바뀌므로 잠깐 기다림
  log('초록 슬라임에 부딪힘:', hit, '/ 하트', await ev('knight.lives'), '/ 깜빡임', (await ev('knight.hurt')) > 0,
      '/ 슬라임 동작', await ev('slimes[0].anim'), '/ 기사 동작', await ev('knight.anim'));
  await shot('04-hit');
  await sleep(1600);
  log('1.5초 뒤 다시 맞을 수 있음:', (await ev('knight.hurt')) <= 0);

  // 왼쪽으로 걷기: 기사가 왼쪽을 보는지
  await ev('knight.x = 140; knight.y = GROUND_TOP - KB.h; knight.vy = 0; true');
  await down('ArrowLeft'); await sleep(250);
  log('왼쪽으로 갈 때 동작:', await ev('knight.anim'), '/ 보는 방향:', await ev('knight.face'));
  await shot('04b-left');
  await up('ArrowLeft'); await sleep(200);
  log('멈춘 뒤 동작:', await ev('knight.anim'), '/ 보는 방향(왼쪽 그대로):', await ev('knight.face'));
  await shot('04c-left-idle');

  // 피하기 기술: Shift 로 구르면 슬라임을 지나가도 하트가 줄지 않음
  await ev(`knight.hurt = 0; knight.safe = 0; knight.face = 1; knight.vx = 0;
    knight.x = slimes[0].x - 5 - KB.w - 10; knight.y = GROUND_TOP - KB.h; knight.rollCool = 0; true`);   // 슬라임 바로 앞(10px)
  const livesBefore = await ev('knight.lives');
  const rollStartX = await ev('knight.x');
  await tap('ShiftLeft'); await sleep(150);
  log('구르기 시작: 동작', await ev('knight.anim'), '/ 남은 구르기(초)', (await ev('knight.roll')).toFixed(2));
  await shot('04d-roll');
  await waitUntil('knight.roll <= 0', 1000); await sleep(50);
  log('굴러서 슬라임 지나감: 하트', livesBefore, '→', await ev('knight.lives'),
      '/ 굴러간 거리(px)', Math.round(await ev('knight.x') - rollStartX),
      '/ 슬라임보다 오른쪽', await ev('knight.x > slimes[0].x + 5'), '/ 끝난 뒤 동작', await ev('knight.anim'));
  await tap('ShiftLeft'); await sleep(50);
  log('끝나자마자 다시 Shift: 바로 다시 구름?', (await ev('knight.roll')) > 0 ? '구름(잘못)' : '안 구름(기다려야 함)');
  await sleep(700);
  await tap('ShiftLeft'); await sleep(50);
  log('기다린 뒤 다시 Shift: 구름?', (await ev('knight.roll')) > 0);
  await sleep(500);
  await ev('knight.x = 100; knight.y = GROUND_TOP - KB.h; knight.vx = 0; true');
  await sleep(100);

  // 발판에 올라서기: 첫 발판 위에서 떨어뜨려 봄
  await ev('knight.x = PLATFORMS[0].x + 10; knight.y = PLATFORMS[0].y - 40; knight.vy = 0; knight.hurt = 0; true');
  await sleep(600);
  log('발판 위에 섬:', await ev('knight.onGround && Math.abs(knight.y + KB.h - PLATFORMS[0].y) < 0.5'));
  await shot('05-platform');

  // 노랑: 뛰는지 / 빨강: 가까이 가면 공격하는지
  await ev(`window.__hop = false; (function r() { if (slimes[2].y < GROUND_TOP - 5) __hop = true; requestAnimationFrame(r); })(); true`);
  await ev('knight.x = slimes[2].x - 120; knight.y = GROUND_TOP - KB.h; true');
  await sleep(2000);
  log('노랑 슬라임이 뜀:', await ev('__hop'));
  await shot('06-yellow');
  await ev('knight.x = slimes[3].x - 45; knight.y = GROUND_TOP - KB.h; knight.hurt = 5; true');   // 맞지 않게 해 두고 가까이 감
  const attacked = await waitUntil('slimes[3].anim === "attack"', 2000);
  await sleep(350); await shot('07-red-attack');
  log('빨강 슬라임이 공격:', attacked, '/ 오른쪽으로 갈 때 뒤집힘(dir):', await ev('slimes[3].dir'));

  // 금화를 다 모으면
  await ev(`coins.forEach((c, i) => { if (i < coins.length - 1) c.taken = true; });
    const c = coins[coins.length - 1]; knight.x = c.x - 6; knight.y = c.y - 7; knight.vy = 0; knight.hurt = 0; true`);
  await sleep(300);
  log('다 모은 뒤 상태:', await ev('state'), '/ 슬라임 동작', await ev('slimes.map(s => s.anim).join(",")'));
  await sleep(1000); await shot('08-won');
  const firstTime = await ev('playTime');
  log('최고 기록: 새 기록', await ev('newRecord'), '/ 저장된 값', await ev('localStorage.getItem(bestKey())'),
      '/ 이번 시간', firstTime.toFixed(2));

  // 더 느리게 다 모으면 최고 기록이 바뀌지 않음
  await tap('KeyR'); await sleep(100);
  await ev(`{ playTime = ${firstTime} + 50; coins.forEach((c, i) => { if (i < coins.length - 1) c.taken = true; });
    const c = coins[coins.length - 1]; knight.x = c.x - 6; knight.y = c.y - 7; knight.vy = 0; knight.hurt = 0; knight.safe = 0; } true`);
  await sleep(300);
  log('더 느린 판: 상태', await ev('state'), '/ 새 기록', await ev('newRecord'),
      '/ 최고 기록 그대로', Math.abs(await ev('bestTime') - firstTime) < 0.001);
  await sleep(300); await shot('08b-won-slower');

  // R → 처음부터
  await tap('KeyR'); await sleep(200);
  log('R 뒤: 상태', await ev('state'), '/ 금화', await ev('coins.filter(c => c.taken).length'), '/ 하트', await ev('knight.lives'),
      '/ 시간', await ev('playTime.toFixed(1)'));

  // 하트를 다 잃으면
  await ev('knight.lives = 1; knight.hurt = 0; knight.safe = 0; knight.x = slimes[0].x - 6; knight.y = GROUND_TOP - KB.h; true');
  await sleep(300);
  log('마지막 하트 잃은 뒤 상태:', await ev('state'), '/ 슬라임 동작', await ev('slimes.map(s => s.anim).join(",")'));
  await sleep(1300);
  log('쓰러진 뒤 기사:', await ev('knight.anim'), '/ 땅에 닿음', await ev('knight.onGround'));
  await shot('09-over');

  // 창을 다시 열어도(새로 고침) 최고 기록이 남아 있는지
  await ev('setTimeout(() => location.reload(), 0); true');
  await sleep(2000);
  await ev('loadStage(2); true');        // 새로 열면 1스테이지라서 3스테이지로 다시 감
  log('새로 고침 뒤 최고 기록:', await ev('bestTime === null ? "없음" : bestTime.toFixed(2)'),
      '/ 처음 기록과 같음', Math.abs(await ev('bestTime') - firstTime) < 0.001);
  await tap('Space'); await sleep(300);
  await shot('10-best-after-reload');
  await tap('KeyR'); await sleep(200);
};
