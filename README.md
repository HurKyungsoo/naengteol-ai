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

```bash
npx supabase secrets set GEMINI_API_KEY=... GEMINI_MODEL=<이미지 입력을 지원하는 Gemini 모델 ID>
npx supabase functions deploy analyze-fridge
```

그다음 `.env.example`을 `.env`로 복사해 주소와 anon key를 채운다.

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
- [ ] 사진 분석 서버 배포 (`supabase/functions/analyze-fridge`, 현재 앱은 데모 결과)
- [x] 추가 재료(기본 양념) 및 대체 재료 안내
- [x] 재료 소진 처리와 조리 기록
- [ ] 영양정보 표시 (근거 있는 데이터를 확보한 경우에만)
- [ ] 회원 계정과 기기 간 데이터 동기화 (Supabase Auth + 기획서 8장 테이블)

**데이터**
- [x] 레시피 사진 (Unsplash), 재료 3D 아이콘 (Fluent Emoji + 직접 그린 한식 재료)
- [ ] 레시피 100~300개 확보 (현재 샘플 21개, 공공데이터 등 이용 조건이 명확한 자료로)

## 이미지 출처

- **레시피 사진** `assets/recipes/` — Unsplash 라이선스 무료 사진 (Unsplash+ 유료 사진 제외). 사진작가와 원본 링크는 `src/data/assets.ts`에 있고, 앱의 마이 → "사진·아이콘 출처"에서 볼 수 있다.
- **재료 아이콘** `assets/ingredients/` — [Microsoft Fluent Emoji](https://github.com/microsoft/fluentui-emoji) 3D, MIT License (`assets/ingredients/LICENSE-fluentui-emoji.txt`).
- **한식 재료 아이콘** (김치, 대파, 두부, 된장, 고추장, 김, 양배추, 애호박, 간장, 어묵) — Fluent에 없어서 같은 스타일로 직접 그린 것. 원본 SVG는 `assets/ingredients/custom-src/`에 있고, 수정 후 256px PNG로 다시 내보내면 된다.
- 사진·아이콘을 추가하면 `src/data/assets.ts`에 `require` 항목을 추가하고, 재료 이름 → 아이콘 매핑은 `src/lib/icons.ts`에서 고친다.

## 주의

- `src/data/recipes.ts`는 개발용 샘플이다. 출시 전에는 이용 조건이 명확한 공공데이터나 사용 허가를 받은 레시피로 교체한다.
- 웹 미리보기에서 같은 주소(localhost)로 탭을 여러 개 열면 브라우저 저장소를 공유해서 서로 덮어쓴다. 테스트할 때는 탭을 하나만 쓴다.
