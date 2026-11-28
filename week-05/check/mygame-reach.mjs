// 내 게임: 스테이지마다 금화 하나하나에 실제로 닿을 수 있는지 확인 (슬라임은 빼고 길만 봄)
// 게임의 update() 를 그대로 빌려서, 아무렇게나 키를 눌러 보는 시험을 스테이지마다 수천 번 돌린다.
//   node week-05/check/run.mjs week-05/index.html week-05/check/mygame-reach.mjs
export default async ({ ev, tap, sleep, log }) => {
  await tap('Space'); await sleep(200);
  const result = await ev(`(() => {
    started = false;                       // 화면 쪽 반복은 멈추고 여기서 직접 돌림
    playSfx = () => {};
    const out = [];
    for (let n = 0; n < STAGES.length; n++) {
      loadStage(n);
      slimes = [];
      let seed = 7;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const pool = [JSON.stringify(knight)];    // 지금까지 서 본 자리들
      const seen = new Set();
      const reached = new Set();
      const info = coins.map(() => ({ count: 0, first: null, from: {} }));   // 금화마다: 닿은 횟수, 처음 닿은 시험, 어디서 닿았나
      const where = () => {
        if (!knight.onGround) return '점프 중';
        const by = knight.y + KB.h;
        if (Math.abs(by - GROUND_TOP) < 0.5) return '땅';
        const i = PLATFORMS.findIndex(p => Math.abs(by - p.y) < 0.5 && knight.x + KB.w > p.x && knight.x < p.x + p.w);
        return i < 0 ? '땅' : '발판' + (i + 1);
      };
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
          const before = coins.map(c => c.taken);
          update(1 / 60);
          state = 'play';
          coins.forEach((c, i) => {
            if (c.taken && !before[i]) {
              const w = where();
              info[i].count++;
              if (info[i].first === null) info[i].first = trial + 1;
              info[i].from[w] = (info[i].from[w] || 0) + 1;
            }
          });
          if (knight.onGround) {
            const k = Math.round(knight.x / 8) + ',' + Math.round(knight.y);
            if (!seen.has(k)) { seen.add(k); pool.push(JSON.stringify(knight)); }
          }
        }
        coins.forEach((c, i) => { if (c.taken) reached.add(i); });
      }
      keys.ArrowLeft = keys.ArrowRight = false;
      const missed = coins.map((c, i) => reached.has(i) ? null : COIN_SPOTS[i].join(',')).filter(Boolean);
      const lines = coins.map((c, i) => {
        const f = info[i];
        const top = Object.entries(f.from).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + v).join(', ');
        return '  ' + String(i + 1).padStart(2) + '번 (' + COIN_SPOTS[i].join(',') + ') ' +
          (f.count ? '닿음 · ' + f.count + '번 · 처음 ' + f.first + '번째 시험 · 닿은 곳: ' + top : '못 닿음');
      });
      out.push('[스테이지 ' + (n + 1) + ' · ' + STAGES[n].name + '] 금화 ' + coins.length + '개 중 닿은 금화 ' + reached.size
        + '개 (5000번 시험, 서 본 자리 ' + pool.length + '곳)\\n' + lines.join('\\n')
        + (missed.length ? '\\n  못 닿은 금화(가로칸,세로칸): ' + missed.join('  ') : ''));
    }
    loadStage(0);
    return out.join('\\n\\n');
  })()`);
  log(result);
};
