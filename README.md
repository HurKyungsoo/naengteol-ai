# 냉털AI

냉장고 속 재료로 만들 수 있는 요리를 추천하는 모바일 앱 (React Native + Expo SDK 57, Expo Router).

## 실행 방법

```bash
npm install
npx expo start
```

- **휴대폰에서 실행:** Play 스토어에서 **Expo Go**를 설치하고, 터미널에 뜬 QR 코드를 스캔한다. (PC와 휴대폰이 같은 Wi-Fi에 있어야 함)
- **브라우저에서 실행:** `npx expo start --web`
- **휴대폰 프레임 미리보기:** 웹 서버를 켠 뒤 http://localhost:8081/phone-preview.html

검사:

```bash
npm run typecheck
npx eslint src
npx expo-doctor
```

## 화면 구성

| 화면 | 파일 |
|---|---|
| 스플래시 | `src/components/Intro.tsx` (저장 데이터를 불러오는 동안 표시) |
| 홈 (탭) | `src/app/(tabs)/index.tsx` |
| 추천 레시피 (탭) | `src/app/(tabs)/recipes.tsx` |
| 재료 관리 (탭) — 보유 재료 / 사용 기록 | `src/app/(tabs)/pantry.tsx` |
| 마이페이지 (탭) | `src/app/(tabs)/my.tsx` |
| 재료 등록 — 직접 입력 / 사진 / 최근 사용 | `src/app/ingredients/add.tsx` |
| 사진 촬영 | `src/app/camera.tsx` |
| AI 분석 결과 | `src/app/analysis.tsx` |
| 식단 및 조건 선택 | `src/app/preferences.tsx` |
| 레시피 상세 | `src/app/recipe/[id]/index.tsx` |
| 조리 순서 (+ 완료 시 재료 정리) | `src/app/recipe/[id]/cook.tsx` |
| 대체 재료 안내 | `src/app/recipe/[id]/substitutes.tsx` |
| 즐겨찾기 | `src/app/favorites.tsx` |
| 고객센터 / 약관 (준비 중) | `src/app/info.tsx` |

그 외:

```
src/components/       공용 UI (헤더, 하단 버튼, 레시피 이미지, 탭, 목록 항목 등)
src/data/recipes.ts   샘플 레시피 데이터
src/lib/recommend.ts  추천 로직 (보유 비율, 식단·시간·난이도·인분 필터)
src/lib/ingredients.ts 재료 이름 정규화(달걀→계란 등), 대체 재료 표
src/lib/icons.ts      재료 → 3D 아이콘
src/data/assets.ts    사진·아이콘 require 목록, 사진 출처
src/lib/analyze.ts    사진 분석 클라이언트 (서버 미설정 시 데모 결과)
src/state/AppState.tsx 재료·즐겨찾기·조리 기록·조건·프로필 (기기에 저장)
supabase/functions/analyze-fridge/  사진 분석 서버 (Gemini API 호출)
```

### 추천 방식

1. 레시피 재료를 **핵심 재료 / 선택 재료 / 기본 양념**으로 나눈다. 점수는 핵심 재료로만 계산한다.
2. 냉장고에 있는 핵심 재료는 1점, 대체 재료로 채울 수 있으면 0.5점으로 보유 비율을 구한다.
3. "보유 재료 우선 사용"이 켜져 있으면 핵심 재료가 하나도 없는 레시피는 뺀다.
4. 보유 비율이 높고 조리 시간이 짧은 순으로 정렬한다.

## 사진 분석 (Gemini) 연결

API 키를 앱에 넣지 않도록 Supabase Edge Function을 거친다. 설정 전에는 **데모 결과**가 나오고 화면에 "데모 결과예요"라고 표시된다.
(Windows PowerShell에서는 `npx` 대신 `npx.cmd`)

```bash
npx supabase login
npx supabase link --project-ref <프로젝트 ref>
npx supabase secrets set GEMINI_API_KEY=<Gemini 키> APP_KEY=<publishable 키>
npx supabase functions deploy analyze-fridge
```

- 모델 기본값은 `gemini-3.5-flash-lite`. 바꾸려면 `GEMINI_MODEL` secret을 설정한다.
- 함수는 `apikey` 헤더가 `APP_KEY`와 같을 때만 응답하고, 이미지 약 2MB 제한과 분당 10회 호출 제한이 있다.
- 앱이 호출할 함수 주소와 publishable 키(둘 다 공개 값)는 `src/config.ts`에 있어서 **`.env` 없이 바로 실행된다.** 다른 서버를 쓰거나 데모로 돌릴 때만 `.env`로 덮어쓴다 (`EXPO_PUBLIC_ANALYZE_URL=demo`).

## 진행 상황 (기획서 9장 MVP 범위 기준)

**1차 출시 필수 기능**
- [x] 모바일 앱 기본 화면과 화면 이동 (13개 화면, Expo Router)
- [x] 재료 직접 입력·수정·삭제 (여러 재료 한 번에 등록 포함)
- [x] 식단 유형 선택 + 조리 시간·난이도·인분·보유 재료 우선 조건
- [x] 레시피 데이터 기반 추천 (일치도, 부족 재료 수, 식단, 조리 시간)
- [x] 레시피 상세, 조리 순서, 즐겨찾기
- [ ] Android 실제 기기·에뮬레이터 테스트 및 빌드 (EAS Build)
- [x] API 키 보안 설정 (Gemini 키는 서버 secrets로만, 앱에는 넣지 않음)
- [ ] 오류 처리 점검 (네트워크·분석 실패는 화면 안내 있음, 전반 점검은 남음)

**일정에 따라 추가할 기능**
- [x] 냉장고 사진 촬영·앨범 선택 → 크기 축소(가로 1024px)·압축 후 분석 요청
- [x] AI가 추출한 재료 수정 및 확정 (확신도 낮은 재료는 기본 체크 해제)
- [x] 사진 분석 서버 배포 (`supabase/functions/analyze-fridge`, Supabase 서울 리전, `.env` 설정 시 실제 분석)
- [x] 추가 재료(기본 양념) 및 대체 재료 안내
- [x] 재료 소진 처리와 조리 기록
- [x] 영양정보 표시 (식품안전나라 원본의 1인분 값만)
- [ ] 회원 계정과 기기 간 데이터 동기화 (Supabase Auth + 기획서 8장 테이블)

**데이터**
- [x] 레시피 사진 (Unsplash), 재료 아이콘 (Flaticon + 입체 효과)
- [x] 레시피 100~300개 확보 → 공공 레시피 1,151개 + 샘플 21개 (Supabase DB, 기기 캐시)

## 공공 레시피 데이터 (식품안전나라)

식품의약품안전처 식품안전나라 "조리식품의 레시피 DB"(COOKRCP01) 1,151개를 Supabase `recipes` 테이블에 넣어 쓴다.
앱은 처음 실행할 때 받아 기기에 저장하고(약 2MB), 하루에 한 번 새로 받는다. 서버에 연결할 수 없으면 앱에 들어 있는 샘플 21개로 동작한다.

- 이용 조건: **출처 표시 조건으로 자유이용** (공공데이터활용 이용약관 제10조). 앱 상세 화면과 출처 화면에 표시한다. 데이터 내용은 바꾸지 않는다.
- 원본에 없는 **조리 시간·난이도는 추정값**이라 "약 N분"으로 표시한다. 영양정보는 원본의 1인분 값만 쓴다.
- 테이블 만들기 (처음 한 번): `npx supabase db query --linked --project-ref <ref> -f supabase/migrations/20261020000000_recipes.sql`
- 데이터 갱신: `.env`에 `FOODSAFETY_API_KEY`를 넣고 `node scripts/import-recipes.mjs`로 변환 결과를 확인한 뒤 `--apply`로 적용한다.
- 재료 글("연두부 75g(3/4모), 칵테일새우 20g")은 스크립트가 재료명·분량·양념 여부로 나눈다. 규칙은 `scripts/import-recipes.mjs`의 `parseIngredients`.

### AI 보충 설명 (explain-recipe)

공공 레시피 화면에서 "AI로 자세히 설명 받기"를 누르면 `supabase/functions/explain-recipe`가 Gemini로 보충 설명
(시작 전 준비, 단계별 팁, 위생 주의)을 만든다.

- 원본 레시피는 바꾸지 않는다 (약관상 변조 금지). 화면에 "AI 보충 설명"으로 구분해 표시한다.
- 함수는 앱이 보낸 글이 아니라 **DB의 원본 레시피**를 읽어 만든다 → 임의 질문에 악용할 수 없다.
- 한 번 만든 설명은 `recipe_guides` 테이블에 저장해 모든 사용자가 같이 쓴다 (두 번째부터 즉시, 비용 없음). 앱도 기기에 저장한다.
- 새로 만들 때만 호출 제한(분당 6회)이 적용된다. 테이블: `supabase/migrations/20261021000000_recipe_guides.sql`
- 배포: `npx supabase functions deploy explain-recipe --project-ref <ref> --use-api`
- 설명 문구를 바꾸고 다시 만들려면 `supabase/functions/_shared/guide.ts`의 `RULES`를 고쳐 배포하고, `recipe_guides`에서 해당 행을 지우고, 앱의 `src/lib/guide.ts` `CACHE_KEY` 버전을 올린다.
- 모델: `gemini-3.5-flash-lite`. 2026-10 점검(레시피 9종): flash-lite는 2~3초·전부 성공. 3.6-flash는 11~14초, 3.8-flash는 80~120초에 503 실패가 잦아 버튼을 누르고 기다리는 용도로는 쓰지 않았다. 품질 차이는 규칙(RULES)을 다듬어 줄였다 (오타·"약 중불"·억지 시간·스테이크 익힘 오류 등 자동 검사 13건 → 0건).

### 참고 영상 (find-video)

공공 레시피 상세 화면을 열면 `supabase/functions/find-video`가 DB의 레시피 이름으로 유튜브를 검색해 참고 영상을 하나 고른다. 앱에서는 유튜브 공식 임베드 플레이어로만 재생한다 (조회수·수익은 원작자에게).

- 고르는 기준: 임베드 허용, 30초~20분, 제목에 레시피 이름의 낱말이 많이 들어간 영상. 하나도 맞지 않으면 영상 없음으로 두고 카드를 숨긴다.
- 결과(없음 포함)는 `recipe_videos` 테이블에 저장해 모두가 같이 쓴다. 테이블: `supabase/migrations/20261022000000_recipe_videos.sql`
- secrets: `YOUTUBE_API_KEY` (Google Cloud, YouTube Data API v3만 허용하도록 제한한 키). 무료 할당량은 하루 10,000 단위, 새 레시피 검색 1번에 약 101 단위 → 하루 약 99개. 다 쓰면 저장하지 않고 다음 날 다시 찾는다.
- **미리 채우기:** pg_cron이 매일 UTC 08:30~08:50(한국 오후 5시 반쯤, 할당량 초기화 직후)에 `{ batch: 33 }`으로 세 번 불러 하루 99개씩 채운다. 30일 지난 영상은 아직 재생 가능한지 다시 확인하고, 안 되면 지워서 다시 검색한다. 설정: `supabase/migrations/20261023000000_find_video_cron.sql` (CRON_KEY는 함수 secret과 DB vault에만 둔다). 결과 확인: `select status_code, content from net._http_response order by id desc limit 3;`
- 앱은 영상 목록을 하루 한 번 받아 홈의 "영상으로 따라 하기"와 레시피 탭의 "▶ 영상" 필터에 쓴다 (영상이 4개 미만이면 홈 줄은 숨김).
- 배포: `npx supabase functions deploy find-video --project-ref <ref> --use-api`
- 휴대폰 미리보기에서 특정 화면 열기: `/phone-preview.html?path=/recipe/fs-1060`

## 이미지 출처

- **레시피 사진** `assets/recipes/` — Unsplash 라이선스 무료 사진 (Unsplash+ 유료 사진 제외). 사진작가와 원본 링크는 `src/data/assets.ts`에 있고, 앱의 마이 → "사진·아이콘 출처"에서 볼 수 있다.
- **재료 아이콘** `assets/ingredients/` — [Flaticon](https://www.flaticon.com/) Special Flat 스타일 (Freepik/Magnific). 무료 라이선스는 **출처 표시 필수**라 앱의 출처 화면에 표시한다. 원본 512px PNG와 아이콘별 링크는 `assets/ingredients/flaticon-src/` (`LICENSE.txt`, `picks.json`).
- 앱용 아이콘은 원본에 그림자·빛 반사를 더해 256px로 만든 것이다: `node scripts/stylize-icons.mjs` (효과 세기는 스크립트의 `EFFECT`). 아이콘을 바꾸려면 같은 이름으로 원본을 덮어쓰고 다시 실행한다. 받을 목록은 `docs/flaticon-icons.md`.
- 사진·아이콘을 추가하면 `src/data/assets.ts`에 `require` 항목을 추가하고, 재료 이름 → 아이콘 매핑은 `src/lib/icons.ts`에서 고친다.

## 주의

- `src/data/recipes.ts`는 개발용 샘플이다. 출시 전에는 이용 조건이 명확한 공공데이터나 사용 허가를 받은 레시피로 교체한다.
- 웹 미리보기에서 같은 주소(localhost)로 탭을 여러 개 열면 브라우저 저장소를 공유해서 서로 덮어쓴다. 테스트할 때는 탭을 하나만 쓴다.
