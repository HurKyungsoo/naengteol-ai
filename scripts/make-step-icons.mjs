// 조리 모드 단계 아이콘(섞기·팬·말기·썰기·끓이기)을 재료 아이콘과 같은 느낌으로 만든다.
//
//   node scripts/make-step-icons.mjs
//
// 1) 단색 면으로 그린 원본을 assets/steps/src/ 에 512px로 그리고
// 2) scripts/stylize-icons.mjs 로 그림자·빛 반사를 입혀 assets/steps/ 에 256px로 저장한다.
// 단계 사진이 없는 레시피(앱에 들어 있는 샘플 레시피)에서 사진 자리에 쓴다.

import { Resvg } from '@resvg/resvg-js';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const SRC = path.join(ROOT, 'assets', 'steps', 'src');
const OUT = path.join(ROOT, 'assets', 'steps');

const ICONS = {
  // 볼과 거품기
  mix: `
    <path d="M60 250 h392 c0 120 -88 200 -196 200 s-196 -80 -196 -200z" fill="#7FC4E8"/>
    <path d="M60 250 h392 c0 26 -4 50 -12 72 H72 c-8 -22 -12 -46 -12 -72z" fill="#9AD3F0"/>
    <rect x="44" y="226" width="424" height="40" rx="20" fill="#5EA9D6"/>
    <rect x="300" y="40" width="34" height="170" rx="17" transform="rotate(32 317 125)" fill="#B9773F"/>
    <path d="M228 210 c-30 -60 0 -110 40 -100 c40 10 30 70 -10 110z" fill="none" stroke="#C9D1D8" stroke-width="16"/>
    <path d="M250 214 c10 -60 50 -90 80 -70 c30 20 0 70 -50 80z" fill="none" stroke="#C9D1D8" stroke-width="16"/>
    <ellipse cx="256" cy="246" rx="150" ry="14" fill="#F6D365"/>`,
  // 달걀이 올라간 프라이팬
  pan: `
    <rect x="330" y="230" width="170" height="44" rx="22" transform="rotate(-18 415 252)" fill="#9A5F2E"/>
    <ellipse cx="220" cy="270" rx="190" ry="150" fill="#3E434A"/>
    <ellipse cx="220" cy="262" rx="160" ry="124" fill="#59606A"/>
    <path d="M150 230 c20 -50 110 -60 140 -10 c30 50 -10 100 -70 96 c-60 -4 -90 -40 -70 -86z" fill="#FFFFFF"/>
    <circle cx="218" cy="262" r="38" fill="#FFC12E"/>
    <circle cx="206" cy="250" r="10" fill="#FFE08A"/>`,
  // 돌돌 만 계란말이
  roll: `
    <rect x="70" y="170" width="300" height="190" rx="40" fill="#F6C945"/>
    <rect x="70" y="170" width="300" height="56" rx="28" fill="#FAD96E"/>
    <ellipse cx="370" cy="265" rx="80" ry="95" fill="#F2B52E"/>
    <path d="M370 265 m-12 0 a12 14 0 1 1 24 0 a28 32 0 1 1 -50 0 a46 54 0 1 1 86 0" fill="none" stroke="#D9921B" stroke-width="14" stroke-linecap="round"/>
    <circle cx="150" cy="230" r="10" fill="#7CBF4E"/>
    <circle cx="210" cy="290" r="9" fill="#F08A3C"/>
    <circle cx="270" cy="220" r="8" fill="#7CBF4E"/>`,
  // 도마와 칼
  knife: `
    <rect x="70" y="250" width="380" height="190" rx="36" fill="#E2AE6E"/>
    <rect x="70" y="250" width="380" height="40" rx="20" fill="#ECC089"/>
    <circle cx="410" cy="290" r="14" fill="#C98E4C"/>
    <path d="M120 230 L380 96 c30 -14 50 10 34 34 L170 290 c-24 14 -56 -36 -50 -60z" fill="#DCE2E8"/>
    <path d="M120 230 L380 96 c30 -14 50 10 34 34 L170 290z" fill="#C3CBD3" opacity="0.6"/>
    <rect x="60" y="250" width="110" height="46" rx="23" transform="rotate(-28 115 273)" fill="#4A3426"/>
    <circle cx="300" cy="380" r="28" fill="#F08A3C"/>
    <circle cx="350" cy="370" r="24" fill="#7CBF4E"/>`,
  // 김이 나는 냄비
  pot: `
    <path d="M200 100 c-20 -30 20 -50 0 -80" fill="none" stroke="#D5DADF" stroke-width="18" stroke-linecap="round"/>
    <path d="M300 100 c-20 -30 20 -50 0 -80" fill="none" stroke="#D5DADF" stroke-width="18" stroke-linecap="round"/>
    <rect x="30" y="250" width="80" height="40" rx="20" fill="#B83A2A"/>
    <rect x="402" y="250" width="80" height="40" rx="20" fill="#B83A2A"/>
    <path d="M90 220 h332 v150 a60 60 0 0 1 -60 60 h-212 a60 60 0 0 1 -60 -60z" fill="#E2553F"/>
    <rect x="90" y="220" width="332" height="50" fill="#EC7560"/>
    <rect x="70" y="180" width="372" height="50" rx="25" fill="#C9442F"/>
    <rect x="226" y="140" width="60" height="44" rx="16" fill="#8E2E21"/>`,
};

fs.mkdirSync(SRC, { recursive: true });
for (const [name, body] of Object.entries(ICONS)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">${body}</svg>`;
  fs.writeFileSync(path.join(SRC, `${name}.png`), new Resvg(svg).render().asPng());
}
execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'stylize-icons.mjs'), SRC, OUT], { stdio: 'inherit' });
