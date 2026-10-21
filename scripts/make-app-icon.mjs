// 앱 아이콘·스플래시 이미지를 만든다: 오렌지 바탕 + 흰 냉장고 + 토마토 스티커.
//
//   node scripts/make-app-icon.mjs
//
// 만드는 파일 (assets/):
//   icon.png                      1024² 꽉 찬 정사각형 (iOS·스토어용, 모서리는 OS가 깎는다)
//   android-icon-foreground.png   적응형 아이콘 앞면. 가운데 안전 영역 안에만 그린다
//   android-icon-background.png   적응형 아이콘 바탕 (단색)
//   android-icon-monochrome.png   Android 13+ 테마 아이콘용 흰 실루엣
//   splash-icon.png               스플래시 가운데 이미지 (둥근 아이콘, 바깥은 투명)
//   favicon.png                   웹 파비콘 48²

import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const ASSETS = path.join(ROOT, 'assets');

const ACCENT = '#F26B2A'; // theme.ts colors.accent
const S = 1024;

const tomato = fs.readFileSync(path.join(ASSETS, 'ingredients', 'tomato.png')).toString('base64');

// 1024 캔버스 기준 냉장고 + 토마토. 문 칸막이와 손잡이는 바탕색으로 뚫어 보이게 한다.
function fridge(cut) {
  return `
    <rect x="272" y="176" width="480" height="672" rx="112" fill="#FFFFFF"/>
    <rect x="272" y="408" width="480" height="32" fill="${cut}"/>
    <rect x="352" y="256" width="32" height="96" rx="16" fill="${cut}"/>
    <rect x="352" y="504" width="32" height="160" rx="16" fill="${cut}"/>`;
}
const sticker = `<image href="data:image/png;base64,${tomato}" x="520" y="520" width="440" height="440" transform="rotate(10 740 740)"/>`;

// 냉장고+토마토 묶음의 가운데(약 640, 590)를 캔버스 가운데로 옮기며 줄인다.
function fit(scale) {
  return `translate(${S / 2} ${S / 2}) scale(${scale}) translate(-640 -590)`;
}

function svg(body, { size = S, clip = false } = {}) {
  const defs = clip ? `<clipPath id="r"><rect width="${S}" height="${S}" rx="${S * 0.225}"/></clipPath>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${S} ${S}">
  <defs>${defs}</defs>
  <g ${clip ? 'clip-path="url(#r)"' : ''}>${body}</g>
</svg>`;
}

function render(name, markup, size = S) {
  const png = new Resvg(markup, { fitTo: { mode: 'width', value: size } }).render().asPng();
  fs.writeFileSync(path.join(ASSETS, name), png);
  console.log(`${name} (${size}²)`);
}

const full = `<rect width="${S}" height="${S}" fill="${ACCENT}"/><g transform="${fit(0.82)}">${fridge(ACCENT)}${sticker}</g>`;

render('icon.png', svg(full));
// 적응형 아이콘은 108dp 중 가운데 66dp만 늘 보인다 → 묶음을 그 안에 들어가게 줄인다.
render('android-icon-foreground.png', svg(`<g transform="${fit(0.66)}">${fridge(ACCENT)}${sticker}</g>`));
render('android-icon-background.png', svg(`<rect width="${S}" height="${S}" fill="${ACCENT}"/>`));
// 모노크롬은 모양(알파)만 쓰인다. 칸막이·손잡이는 투명하게 뚫는다.
render(
  'android-icon-monochrome.png',
  svg(`<mask id="m"><g transform="${fit(0.66)}">${fridge('#000')}</g></mask>
  <rect width="${S}" height="${S}" fill="#FFFFFF" mask="url(#m)"/>`),
  432,
);
render('splash-icon.png', svg(full, { clip: true }));
render('favicon.png', svg(full, { clip: true }), 48);
