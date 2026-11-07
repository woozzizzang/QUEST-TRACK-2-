// 내 게임: 금화 하나하나에 실제로 닿을 수 있는지 확인 (슬라임은 빼고 길만 봄)
// 게임의 update() 를 그대로 빌려서, 아무렇게나 키를 눌러 보는 시험을 수천 번 돌린다.
//   node week-05/check/run.mjs week-05/index.html week-05/check/mygame-reach.mjs
export default async ({ ev, tap, sleep, log }) => {
  await tap('Space'); await sleep(200);
  const result = await ev(`(() => {
    started = false;                       // 화면 쪽 반복은 멈추고 여기서 직접 돌림
    playSfx = () => {};
    resetGame();
    slimes = [];
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const pool = [JSON.stringify(knight)];    // 지금까지 서 본 자리들
    const seen = new Set();
    const reached = new Set();
    for (let trial = 0; trial < 5000; trial++) {
      knight = JSON.parse(pool[Math.floor(rnd() * pool.length)]);
      coins.forEach(c => c.taken = false);
      state = 'play';
      let dir = 0, hold = 0;
      for (let f = 0; f < 180; f++) {
        if (hold-- <= 0) { dir = [-1, 0, 1, 1][Math.floor(rnd() * 4)]; hold = 5 + rnd() * 40; }
        keys.ArrowLeft = dir < 0;
        keys.ArrowRight = dir > 0;
        if (rnd() < 0.06) jumpBuffer = JUMP_BUFFER;
        update(1 / 60);
        state = 'play';
        if (knight.onGround) {
          const k = Math.round(knight.x / 8) + ',' + Math.round(knight.y);
          if (!seen.has(k)) { seen.add(k); pool.push(JSON.stringify(knight)); }
        }
      }
      coins.forEach((c, i) => { if (c.taken) reached.add(i); });
    }
    keys.ArrowLeft = keys.ArrowRight = false;
    const missed = coins.map((c, i) => reached.has(i) ? null : COIN_SPOTS[i].join(',')).filter(Boolean);
    resetGame();
    return '금화 ' + coins.length + '개 중 닿은 금화 ' + reached.size + '개'
      + (missed.length ? '\\n못 닿은 금화(가로칸,세로칸): ' + missed.join('  ') : '');
  })()`);
  log(result);
};
