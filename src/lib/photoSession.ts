// 촬영한 사진을 분석 화면으로, 분석 결과를 냉장고 점검 화면으로 넘기기 위한 임시 보관소.
// base64는 너무 커서 라우트 파라미터로 넘기지 않는다.

export type CapturedPhoto = {
  uri: string;
  base64: string;
  mimeType: string;
  /** 칸별로 찍을 때 어느 칸인지 ("위 칸" 등). 앨범에서 고른 사진은 없다. */
  label?: string;
};

let photos: CapturedPhoto[] = [];

export function setCapturedPhotos(list: CapturedPhoto[]) {
  photos = list;
}

export function getCapturedPhotos(): CapturedPhoto[] {
  return photos;
}

/** 사진에 안 보인 냉장고 재료. 여러 장을 찍었을 때만 점검 화면에서 "다 썼어요?"를 묻는다. */
let missing: string[] = [];

export function setMissingIds(ids: string[]) {
  missing = ids;
}

export function getMissingIds(): string[] {
  return missing;
}
