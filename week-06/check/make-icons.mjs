// icons/icon.svg 를 PNG 아이콘으로 바꾸는 도구 (새로 설치할 것 없이 컴퓨터의 Edge 를 씀)
// 쓰는 법 (QUEST-TRACK-2- 폴더에서):
//   node week-06/check/make-icons.mjs
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ICONS = resolve(HERE, '..', 'icons');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const svg = readFileSync(join(ICONS, 'icon.svg'), 'utf8');
const SIZES = [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]];

const work = mkdtempSync(join(tmpdir(), 'icons-'));
for (const [name, size] of SIZES) {
  const page = join(work, `${size}.html`);
  writeFileSync(page, `<!doctype html><html><body style="margin:0;overflow:hidden">
    <div style="width:${size}px;height:${size}px">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</div>
    </body></html>`);
  const out = join(ICONS, name);
  spawnSync(EDGE, ['--headless', '--disable-gpu', '--hide-scrollbars', `--user-data-dir=${join(work, 'profile')}`,
    `--window-size=${size},${size}`, `--screenshot=${out}`, pathToFileURL(page).href], { stdio: 'ignore' });
  console.log('만듦:', out);
}
rmSync(work, { recursive: true, force: true });
