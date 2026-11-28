// 내 게임: 스테이지 5개 확인 (맵마다 슬라임·금화·공중섬 수, 깨면 다음 스테이지로, 최고 기록은 스테이지마다 따로)
//   node week-05/check/run.mjs week-05/index.html week-05/check/mygame-stages.mjs
export default async ({ ev, tap, shot, sleep, log }) => {
  await ev('for (let i = 1; i <= STAGES.length; i++) localStorage.removeItem(`forest-coin-best-time-${i}`); bestTime = null; true');
  log('처음 열었을 때 스테이지:', (await ev('stage')) + 1);
  await shot('00-title');
  await tap('Space'); await sleep(300);

  const total = await ev('STAGES.length');
  for (let n = 0; n < total; n++) {
    const info = await ev(`({ stage: stage + 1, name: STAGES[stage].name, slimes: slimes.length, coins: coins.length,
      platforms: PLATFORMS.length, lives: knight.lives, time: playTime, got: coins.filter(c => c.taken).length,
      colors: slimes.map(s => s.color).join(','),
      inWorld: PLATFORMS.every(p => p.x >= 0 && p.x + p.w <= WORLD_W) && coins.every(c => c.x > 0 && c.x < WORLD_W)
               && slimes.every(s => s.minX >= 0 && s.maxX <= WORLD_W && s.x >= s.minX && s.x <= s.maxX),
      nearStart: slimes.filter(s => s.minX < START_X + 150).length })`);
    log(`스테이지 ${info.stage} · ${info.name}: 슬라임 ${info.slimes} (${info.colors}) / 금화 ${info.coins} / 공중섬 ${info.platforms}`
      + ` / 하트 ${info.lives} / 시간 ${info.time.toFixed(1)} / 모은 금화 ${info.got} / 모두 숲 안 ${info.inWorld}`
      + ` / 시작 자리 가까이 오는 슬라임 ${info.nearStart}`);
    await sleep(300);
    await shot(`${n + 1}a-start`);
    // 숲 가운데와 끝 쪽 모습 (맞지 않게 깜빡임 시간을 길게 걸어 둠)
    await ev('knight.hurt = 99; knight.x = WORLD_W / 2; knight.y = GROUND_TOP - KB.h; knight.vy = 0; true');
    await sleep(1200);
    await shot(`${n + 1}b-middle`);
    await ev('knight.x = WORLD_W - 200; knight.y = GROUND_TOP - KB.h; knight.vy = 0; true');
    await sleep(1200);
    await shot(`${n + 1}c-end`);

    // 금화를 다 모으면 클리어 화면
    await ev(`knight.hurt = 0; coins.forEach((c, i) => { if (i < coins.length - 1) c.taken = true; });
      { const c = coins[coins.length - 1]; knight.x = c.x - 6; knight.y = c.y - 7; knight.vy = 0; } true`);
    await sleep(300);
    log(`  다 모은 뒤: 상태 ${await ev('state')} / 이 스테이지 기록 저장 ${await ev('localStorage.getItem(bestKey()) !== null')}`);
    await sleep(500);
    await shot(`${n + 1}d-clear`);
    await tap('KeyR'); await sleep(100);
    log(`  클리어 화면에서 R: 같은 스테이지 처음부터 ${await ev(`stage === ${n} && state === 'play' && coins.every(c => !c.taken)`)}`);
    await ev(`state = 'won'; true`);            // 다시 클리어 상태로 두고 Enter
    await tap('Enter'); await sleep(200);
    log(`  Enter 뒤: 스테이지 ${(await ev('stage')) + 1} / 상태 ${await ev('state')}`);
  }
  log('마지막 다음은 1스테이지로 돌아옴:', (await ev('stage')) === 0);

  // 하는 중에는 Enter 를 눌러도 넘어가지 않음
  await tap('Enter'); await sleep(100);
  log('하는 중에 Enter: 스테이지 그대로', (await ev('stage')) === 0);

  // 하트를 다 잃고 R → 같은 스테이지 다시 (2스테이지에서)
  await ev('loadStage(1); knight.safe = 0; knight.hurt = 0; knight.lives = 1; knight.x = slimes[0].x - 6; knight.y = GROUND_TOP - KB.h; true');
  await sleep(300);
  log('2스테이지에서 하트 다 잃음: 상태', await ev('state'));
  await sleep(800);
  await shot('20-over');
  await tap('KeyR'); await sleep(100);
  log('R 뒤: 스테이지', (await ev('stage')) + 1, '/ 하트', await ev('knight.lives'), '/ 상태', await ev('state'));

  // 최고 기록이 스테이지마다 따로 저장되는지
  log('저장된 기록:', await ev(`STAGES.map((s, i) => (i + 1) + ':' + (localStorage.getItem('forest-coin-best-time-' + (i + 1)) ? '있음' : '없음')).join(' ')`));
  await ev(`localStorage.setItem('forest-coin-best-time-1', '11'); localStorage.setItem('forest-coin-best-time-2', '22');
    loadStage(0); window.__b1 = bestTime; loadStage(1); window.__b2 = bestTime; true`);
  log('1스테이지 기록 11초 / 2스테이지 22초 로 넣고 읽기:', await ev('__b1'), '/', await ev('__b2'));
  await shot('21-stage2-best');
  await ev('for (let i = 1; i <= STAGES.length; i++) localStorage.removeItem(`forest-coin-best-time-${i}`); loadStage(0); true');
};
