// 디자인 확인 시나리오 (날씨 화면과 배틀 화면 둘 다)
// 쓰는 법 (QUEST-TRACK-2- 폴더에서):
//   node week-06/check/run.mjs week-06/index.html week-06/check/design.mjs
//   node week-06/check/run.mjs week-06/battle.html week-06/check/design.mjs
//
// 밝은 화면 · 어두운 화면, 컴퓨터 · 폰 · 작은 폰 폭마다
// 1. 동글동글 글꼴(Jua)을 불러왔는지
// 2. (날씨 화면) 지금 기온이 화면에서 가장 큰 글자인지
// 3. 가장 작은 글자 크기 (폰에서 13px 아래가 있으면 알려 줌)
// 4. 글자와 바탕의 대비 (작은 글자 4.5 이상, 큰 글자 3 이상이어야 잘 읽힘)
// 5. 옆으로 넘치거나 잘린 것
export default async function ({ ev, shot, sleep, waitUntil, log, send }) {
  const isBattle = await ev(`location.pathname.endsWith('battle.html')`);
  const resize = (w, h) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 800 });
  const scheme = v => send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: v }] });

  const measure = () => ev(`(async () => {
    await document.fonts.ready;
    const parse = c => (c.match(/[\\d.]+/g) || []).map(Number);
    const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const bgOf = el => {
      for (let e = el; e; e = e.parentElement) {
        const c = parse(getComputedStyle(e).backgroundColor);
        if (c.length === 3 || (c.length === 4 && c[3] > 0.9)) return c.slice(0, 3);
      }
      return parse(getComputedStyle(document.body).backgroundColor).slice(0, 3);
    };
    const w = document.documentElement.clientWidth;
    const items = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n; (n = walker.nextNode());) {
      if (!n.textContent.trim()) continue;
      const el = n.parentElement;
      if (el.closest('[hidden], script, style, .dmg, .confetti, .crown, .thermo')) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const cs = getComputedStyle(el);
      const size = parseFloat(cs.fontSize);
      const fg = parse(cs.color).slice(0, 3);
      const bg = bgOf(el);
      const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
      const ratio = (a + 0.05) / (b + 0.05);
      const big = size >= 24 || (size >= 18.66 && +cs.fontWeight >= 700);
      items.push({ text: n.textContent.trim().slice(0, 16), id: el.id || el.className, size, ratio: +ratio.toFixed(2), need: big ? 3 : 4.5, font: cs.fontFamily.split(',')[0] });
    }
    // 온도계 안 글자 (svg 는 화면에 그려진 높이로 잼)
    const svgText = [...document.querySelectorAll('.thermo text')].map(t => t.getBoundingClientRect().height).filter(Boolean);
    items.sort((x, y) => y.size - x.size);
    const cut = [...document.querySelectorAll('body *')].filter(el => {
      if (el.closest('.dmg, .confetti, .crown, [hidden]')) return false;
      const r = el.getBoundingClientRect(); return r.width && (r.left < -0.5 || r.right > w + 0.5);
    }).map(el => el.id || el.className?.baseVal || el.className || el.tagName);
    return {
      jua: document.fonts.check('40px Jua'),
      biggest: items.slice(0, 3).map(i => i.text + ' ' + i.size + 'px'),
      tempIsBiggest: items[0] && items[0].id === 'temp',
      smallest: Math.min(...items.map(i => i.size)),
      tooSmall: [...new Set(items.filter(i => i.size < 13).map(i => i.text + ' ' + i.size + 'px'))].slice(0, 5),
      svgSmallest: svgText.length ? +Math.min(...svgText).toFixed(1) : null,
      lowContrast: items.filter(i => i.ratio < i.need).map(i => i.text + ' ' + i.ratio + ' (필요 ' + i.need + ')').slice(0, 6),
      minContrast: Math.min(...items.map(i => i.ratio)),
      overflow: document.documentElement.scrollWidth > w, cut: cut.slice(0, 5),
    };
  })()`);

  // 화면 준비
  if (isBattle) {
    await ev(`document.getElementById('q').value = 'Suwon'; document.getElementById('searchForm').requestSubmit()`);
    await waitUntil(`window.battleState === 'results' || window.battleState === 'error'`, 20000);
    await ev(`document.querySelector('#results button')?.click()`);
    await waitUntil(`window.battleState === 'ready' || window.battleState === 'error'`, 20000);
    log('배틀 화면 상태:', await ev('window.battleState'));
  } else {
    await waitUntil(`['ok','saved','error'].includes(window.appState)`, 12000);
    log('날씨 화면 상태:', await ev('window.appState'));
  }

  for (const mode of ['light', 'dark']) {
    await scheme(mode);
    for (const [w, h] of [[1100, 760], [390, 844], [320, 640]]) {
      await resize(w, h);
      await sleep(isBattle ? 300 : 2600); // 온도계가 다 찰 때까지
      const m = await measure();
      log(`[${mode === 'light' ? '밝은' : '어두운'} ${w}] Jua 글꼴: ${m.jua ? '불러옴' : '못 불러옴'} / 가장 큰 글자: ${m.biggest.join(', ')}`
        + (isBattle ? '' : ` / 지금 기온이 가장 큼: ${m.tempIsBiggest ? '예' : '아니오'}`));
      log(`   가장 작은 글자 ${m.smallest}px${m.tooSmall.length ? ' (13px 아래: ' + m.tooSmall.join(', ') + ')' : ''}`
        + (m.svgSmallest ? ` / 온도계 글자 ${m.svgSmallest}px` : '')
        + ` / 가장 낮은 대비 ${m.minContrast.toFixed(2)}${m.lowContrast.length ? ' → 부족: ' + m.lowContrast.join(', ') : ' (모두 충분)'}`
        + ` / 넘침 ${m.overflow ? '있음' : '없음'}${m.cut.length ? ' 잘린것: ' + m.cut.join(', ') : ''}`);
      await shot(`${isBattle ? 'battle' : 'index'}-${mode}-${w}`);
    }
  }

  // 날씨 화면: 기온이 길어도(-28°) 작은 폰에서 넘치지 않는지
  if (!isBattle) {
    await scheme('light');
    await resize(320, 640);
    await ev(`document.getElementById('temp').textContent = '-28°'`);
    await sleep(100);
    const m = await measure();
    log(`[긴 기온 -28°, 320] 넘침 ${m.overflow ? '있음' : '없음'}${m.cut.length ? ' 잘린것: ' + m.cut.join(', ') : ''}`);
    await shot('index-long-temp-320');
  }
}
