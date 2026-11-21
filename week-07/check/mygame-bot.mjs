// 내 게임: "처음 하는 사람" 흉내 봇으로 100판을 돌려 난이도를 숫자로 본다. (게임은 고치지 않음)
// 게임의 update() 를 그대로 빌려서 1/60초씩 빠르게 돌린다. 화면은 그리지 않는다.
//   node week-05/check/run.mjs week-05/index.html week-05/check/mygame-bot.mjs
//
// 처음 하는 사람 흉내:
// - 0.15~0.30초마다 한 번씩만 판단함 (그 사이엔 누르던 키를 그대로 누름) → 점프가 늦거나 이를 수 있음
// - 슬라임을 알아채는 건 판단할 때마다 70% 확률, 피하기 시작하는 거리도 그때그때 다름
// - 피할 때 구르기(Shift)는 20% 만 쓰고 나머지는 점프
// - 가끔(5%) 머뭇거림
// - 금화는 왼쪽부터 차례로 노림. 한 판 최대 180초, 30초 동안 금화를 못 먹으면 "포기"
export default async ({ ev, tap, sleep, log }) => {
  await tap('Space'); await sleep(200);
  const t0 = Date.now();
  const r = await ev(`(() => {
    started = false;                       // 화면 쪽 반복은 멈추고 여기서 직접 돌림
    playSfx = () => {};
    const savedBest = bestTime;
    saveBest = () => {};                   // 봇 기록은 저장하지 않음
    let seed = 12345;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const DT = 1 / 60;
    const RUNS = 100, MAX_T = 180, STUCK_T = 30;

    const lowPlatform = p => GROUND_TOP - p.y <= 50;
    const surfaceOf = () => {
      if (!knight.onGround) return null;
      const by = knight.y + KB.h;
      if (Math.abs(by - GROUND_TOP) < 0.5) return 'G';
      return PLATFORMS.find(p => Math.abs(by - p.y) < 0.5 && knight.x + KB.w > p.x && knight.x < p.x + p.w) || 'G';
    };
    const surfaceForCoin = c => PLATFORMS.find(p => c.x >= p.x && c.x <= p.x + p.w && c.y < p.y && c.y > p.y - 30) || 'G';
    const stepFor = P => PLATFORMS.find(q => q !== P && q.y > P.y && q.y - P.y <= 50 &&
      (Math.abs(P.x - (q.x + q.w)) <= 60 || Math.abs(q.x - (P.x + P.w)) <= 60));
    const kcx = () => knight.x + KB.w / 2;

    // 길 정하기: 어느 쪽으로 갈지, 지금 뛸지
    function plan(c) {
      const S = surfaceForCoin(c), cur = surfaceOf();
      const toward = x => Math.abs(kcx() - x) < 3 ? 0 : (x > kcx() ? 1 : -1);
      const reachLow = P => {                 // 땅에서 낮은 발판으로: 발판 밑에 가서 제자리 점프
        const mid = P.x + P.w / 2;
        if (Math.abs(kcx() - mid) < P.w / 2 - 10) return { dir: 0, jump: true };
        return { dir: toward(mid), jump: false };
      };
      if (S === 'G' || cur === S) return { dir: toward(c.x), jump: false };
      if (lowPlatform(S)) return cur === 'G' || cur === null ? reachLow(S) : { dir: toward(c.x), jump: false };
      const L = stepFor(S);                   // 높은 발판: 옆의 낮은 발판 끝에서 뛰어 건너감
      if (cur === L) {
        const right = S.x > L.x;
        const edge = right ? L.x + L.w : L.x;
        const dist = right ? edge - (knight.x + KB.w) : knight.x - edge;
        if (dist < 8) return { dir: right ? 1 : -1, jump: true };
        return { dir: right ? 1 : -1, jump: false };
      }
      if (cur === 'G' && L) return reachLow(L);
      return { dir: toward(c.x), jump: false };
    }

    const games = [];
    for (let g = 0; g < RUNS; g++) {
      resetGame();
      const order = coins.map((c, i) => i).sort((a, b) => coins[a].x - coins[b].x);
      let think = 0, dir = 0, airDir = 0, lastCoinT = 0, got = 0;
      const hits = [];
      let rolls = 0, jumps = 0, gaveUp = null;
      while (state === 'play' && playTime < MAX_T) {
        think -= DT;
        if (think <= 0) {
          think = 0.15 + rnd() * 0.15;
          keys.ArrowLeft = keys.ArrowRight = false;
          const ti = order.find(i => !coins[i].taken);
          const c = coins[ti];
          if (rnd() < 0.05) { dir = 0; }      // 머뭇거림
          else {
            const p = plan(c);
            dir = p.dir;
            if (p.jump && knight.onGround) { jumpBuffer = JUMP_BUFFER; airDir = dir; jumps++; }
            // 슬라임 피하기 (땅 위, 안 깜빡일 때)
            if (knight.onGround && knight.hurt <= 0 && rnd() < 0.7) {
              const look = 20 + rnd() * 45;
              const facing = dir !== 0 ? dir : knight.face;
              const danger = slimes.find(s => {
                const dx = (s.x - kcx()) * facing;
                return dx > 0 && dx < look && Math.abs(s.y - (knight.y + KB.h)) < 20;
              });
              if (danger) {
                if (dir === 0) dir = facing;
                if (rnd() < 0.2 && knight.rollCool <= 0) { knight.face = dir; rollPressed = true; rolls++; }
                else { jumpBuffer = JUMP_BUFFER; airDir = dir; jumps++; }
              }
            }
          }
        }
        const d = knight.onGround ? dir : (airDir || dir);
        keys.ArrowRight = d > 0; keys.ArrowLeft = d < 0;
        const lives = knight.lives;
        update(DT);
        if (knight.onGround) airDir = 0;
        if (knight.lives < lives) {
          const near = slimes.reduce((a, s) => Math.abs(s.x - kcx()) < Math.abs(a.x - kcx()) ? s : a);
          hits.push({ color: near.color, t: playTime });
        }
        const n = coins.filter(c => c.taken).length;
        if (n > got) { got = n; lastCoinT = playTime; }
        if (playTime - lastCoinT > STUCK_T) { gaveUp = order.find(i => !coins[i].taken); break; }
      }
      games.push({ result: state === 'won' ? 'clear' : state === 'over' ? 'over' : 'stop', time: playTime, got, hits, rolls, jumps,
                   gaveUp: gaveUp === null ? null : COIN_SPOTS[gaveUp].join(',') });
    }
    keys.ArrowLeft = keys.ArrowRight = false;
    bestTime = savedBest;
    resetGame();
    return JSON.stringify(games);
  })()`);
  const games = JSON.parse(r);
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  const pct = n => Math.round(n / games.length * 100) + '%';
  const avg = a => a.length ? (a.reduce((x, y) => x + y, 0) / a.length) : 0;
  const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
  const clears = games.filter(g => g.result === 'clear');
  const overs = games.filter(g => g.result === 'over');
  const stops = games.filter(g => g.result === 'stop');
  log(`판 수: ${games.length} (돌린 시간 ${secs}초)`);
  log(`끝까지 다 모음: ${clears.length}판 (${pct(clears.length)}) / 하트 다 잃음: ${overs.length}판 (${pct(overs.length)}) / 봇이 길을 못 찾고 멈춤: ${stops.length}판`);
  if (clears.length) {
    const ts = clears.map(g => g.time);
    log(`다 모은 시간: 평균 ${avg(ts).toFixed(1)}초 / 가운데 ${med(ts).toFixed(1)}초 / 가장 빠름 ${Math.min(...ts).toFixed(1)}초 / 가장 느림 ${Math.max(...ts).toFixed(1)}초`);
    const left = [0, 1, 2, 3].map(h => clears.filter(g => 3 - g.hits.length === h).length);
    log(`다 모은 판의 남은 하트: 3개 ${left[3]}판 / 2개 ${left[2]}판 / 1개 ${left[1]}판`);
  }
  log(`한 판에 맞은 횟수: 평균 ${avg(games.map(g => g.hits.length)).toFixed(2)}번 / 한 번도 안 맞은 판 ${games.filter(g => !g.hits.length).length}판`);
  const allHits = games.flatMap(g => g.hits);
  const byColor = {};
  for (const h of allHits) byColor[h.color] = (byColor[h.color] || 0) + 1;
  log('어느 슬라임에 맞았나:', ['green', 'blue', 'yellow', 'red'].map(c => ({ green: '초록', blue: '파랑', yellow: '노랑', red: '빨강' })[c] + ' ' + (byColor[c] || 0) + '번').join(' / '));
  const lastHit = {};
  for (const g of overs) { const c = g.hits[g.hits.length - 1].color; lastHit[c] = (lastHit[c] || 0) + 1; }
  if (overs.length) {
    log('하트를 다 잃은 판의 마지막 슬라임:', JSON.stringify(lastHit), '/ 그때까지 모은 금화 평균', avg(overs.map(g => g.got)).toFixed(1), '개');
    log('하트를 다 잃은 시간: 평균', avg(overs.map(g => g.time)).toFixed(1), '초');
  }
  if (allHits.length) log('처음 맞은 때(시작 후): 평균', avg(games.filter(g => g.hits.length).map(g => g.hits[0].t)).toFixed(1), '초');
  log(`피하기 사용: 구르기 평균 ${avg(games.map(g => g.rolls)).toFixed(1)}번 / 점프 평균 ${avg(games.map(g => g.jumps)).toFixed(1)}번 (한 판)`);
  if (stops.length) {
    const where = {};
    for (const g of stops) where[g.gaveUp || '시간 끝'] = (where[g.gaveUp || '시간 끝'] || 0) + 1;
    log('봇이 멈춘 금화(가로칸,세로칸):', JSON.stringify(where));
  }
};
