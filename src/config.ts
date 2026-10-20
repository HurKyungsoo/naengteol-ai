/**
 * 앱 기본 설정. 여기 있는 값은 모두 공개돼도 되는 값이라 저장소에 함께 둔다.
 * (Gemini API 키 같은 비밀 값은 절대 여기에 넣지 않는다. 서버 secrets로만 관리한다.)
 *
 * .env 에 같은 이름의 EXPO_PUBLIC_ 변수가 있으면 그 값이 우선한다.
 * 사진 분석을 데모 결과로 돌리고 싶으면 .env 에 EXPO_PUBLIC_ANALYZE_URL=demo 를 넣는다.
 */

/** 사진 분석 서버 (Supabase Edge Function, 서울 리전) */
const DEFAULT_ANALYZE_URL = 'https://qxzeuxidlotgzbhcqugj.supabase.co/functions/v1/analyze-fridge';

/** Supabase publishable 키. 브라우저·앱에 노출돼도 되는 공개 키다. */
const DEFAULT_SUPABASE_KEY = 'sb_publishable_lePZzAL-l59kb3GPJfj4sA_HfaHVIYy';

const analyzeUrl = process.env.EXPO_PUBLIC_ANALYZE_URL || DEFAULT_ANALYZE_URL;

/** 사진 분석 서버 주소. 데모 모드면 undefined. */
export const ANALYZE_URL = analyzeUrl === 'demo' ? undefined : analyzeUrl;

export const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY || DEFAULT_SUPABASE_KEY;
