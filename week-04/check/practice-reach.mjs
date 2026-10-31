// 연습 게임: 딸기 하나하나에 실제로 닿을 수 있는지 확인
// 게임의 update() 를 그대로 빌려서, 아무렇게나 키를 눌러 보는 시험을 수천 번 돌린다.
//   node week-04/check/run.mjs week-04/practice/index.html week-04/check/practice-reach.mjs
export default async ({ ev, tap, sleep, log }) => {
  await tap('Space'); await sleep(200);
  const result = await ev(`(() => {
    started = false;                       // 화면 쪽 반복은 멈추고 여기서 직접 돌림
    playSfx = () => {};
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    resetPlayer();
    const pool = [JSON.stringify(p)];      // 지금까지 서 본 자리들
    const seen = new Set();
    const reached = new Set();
    for (let trial = 0; trial < 6000; trial++) {
      p = JSON.parse(pool[Math.floor(rnd() * pool.length)]);
      berries.forEach(b => b.taken = false);
      let dir = 0, hold = 0;
      for (let f = 0; f < 150; f++) {
        if (hold-- <= 0) { dir = [-1, 0, 1][Math.floor(rnd() * 3)]; hold = 5 + rnd() * 30; }
        keys.ArrowLeft = dir < 0;
        keys.ArrowRight = dir > 0;
        if (rnd() < 0.06) jumpPressed = true;
        update(1 / 60);
        if (p.state === 'hit') break;
        if (p.onGround) {
          const k = Math.round(p.x / 8) + ',' + Math.round(p.y);
          if (!seen.has(k)) { seen.add(k); pool.push(JSON.stringify(p)); }
        }
      }
      berries.forEach((b, i) => { if (b.taken) reached.add(i); });
    }
    keys.ArrowLeft = keys.ArrowRight = false;
    return berries.map((b, i) => '딸기' + (i + 1) + ' (칸 ' + (b.x / 16 | 0) + ',' + (b.y / 16 | 0) + '): '
      + (reached.has(i) ? '닿음' : '못 닿음')).join('\\n');
  })()`);
  log(result);
};
