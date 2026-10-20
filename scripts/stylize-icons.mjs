// 플랫 재료 아이콘에 은은한 3D 효과를 입혀 앱용 아이콘을 만든다.
//
//   node scripts/stylize-icons.mjs [원본 폴더] [출력 폴더]
//   기본: assets/ingredients/flaticon-src → assets/ingredients
//
// 원본은 바꾸지 않고 변환본만 만든다. 효과: 아래쪽 그림자 + 왼쪽 위 빛 반사 + 오른쪽 아래 음영.
// 세기는 아래 EFFECT 값으로 조절한다.

import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const SRC = path.resolve(ROOT, process.argv[2] ?? 'assets/ingredients/flaticon-src');
const OUT = path.resolve(ROOT, process.argv[3] ?? 'assets/ingredients');

const SIZE = 256; // 출력 크기
const INSET = 20; // 그림자가 잘리지 않도록 둘레에 남기는 여백
const EFFECT = {
  highlight: 0.5, // 왼쪽 위 빛 반사 세기 (0~1)
  shade: 0.22, // 오른쪽 아래 음영 세기 (0~1)
  shadowOpacity: 0.18,
  shadowBlur: 4,
  shadowOffset: 4,
};

function stylize(pngBase64) {
  const s = SIZE - INSET * 2;
  const icon = `<image href="data:image/png;base64,${pngBase64}" x="${INSET}" y="${INSET - 2}" width="${s}" height="${s}"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <radialGradient id="hl" cx="0.3" cy="0.22" r="0.45">
      <stop offset="0" stop-color="#fff" stop-opacity="${EFFECT.highlight}"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="sh" x1="0" y1="0" x2="0.36" y2="1">
      <stop offset="0.45" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity="${EFFECT.shade}"/>
    </linearGradient>
    <!-- 아이콘 모양(알파)대로만 빛과 음영을 칠한다 -->
    <mask id="shape" mask-type="alpha">${icon}</mask>
    <filter id="drop" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="${EFFECT.shadowBlur}"/>
      <feOffset dy="${EFFECT.shadowOffset}" result="blur"/>
      <feComponentTransfer><feFuncA type="linear" slope="${EFFECT.shadowOpacity}"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <g filter="url(#drop)">
    <g style="isolation:isolate">
      ${icon}
      <rect width="${SIZE}" height="${SIZE}" fill="url(#hl)" mask="url(#shape)" style="mix-blend-mode:screen"/>
      <rect width="${SIZE}" height="${SIZE}" fill="url(#sh)" mask="url(#shape)" style="mix-blend-mode:multiply"/>
    </g>
  </g>
</svg>`;
  return new Resvg(svg, { fitTo: { mode: 'width', value: SIZE } }).render().asPng();
}

if (!fs.existsSync(SRC)) {
  console.error(`원본 폴더가 없습니다: ${SRC}`);
  process.exit(1);
}
const files = fs.readdirSync(SRC).filter((f) => f.toLowerCase().endsWith('.png'));
if (files.length === 0) {
  console.error(`원본 PNG가 없습니다: ${SRC} (docs/flaticon-icons.md 참고)`);
  process.exit(1);
}
fs.mkdirSync(OUT, { recursive: true });
for (const f of files) {
  const png = stylize(fs.readFileSync(path.join(SRC, f)).toString('base64'));
  fs.writeFileSync(path.join(OUT, f.toLowerCase()), png);
}
console.log(`${files.length}개 변환 → ${path.relative(ROOT, OUT)}`);
