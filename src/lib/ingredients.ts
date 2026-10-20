// 재료 표는 서버 함수(check-substitutes)와 같이 쓰기 위해 supabase/functions/_shared/ingredients.ts에 있다.
export {
  hasIngredient,
  isMainIngredient,
  normalizeIngredient,
  substitutesFor,
} from '../../supabase/functions/_shared/ingredients';
