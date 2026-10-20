// 촬영한 사진을 분석 화면으로 넘기기 위한 임시 보관소.
// base64는 너무 커서 라우트 파라미터로 넘기지 않는다.

export type CapturedPhoto = {
  uri: string;
  base64: string;
  mimeType: string;
};

let current: CapturedPhoto | null = null;

export function setCapturedPhoto(photo: CapturedPhoto) {
  current = photo;
}

export function getCapturedPhoto(): CapturedPhoto | null {
  return current;
}
