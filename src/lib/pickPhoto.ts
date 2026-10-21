import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { stripDataUrl } from '@/lib/analyze';
import { setCapturedPhotos, type CapturedPhoto } from '@/lib/photoSession';

// 칸마다 가까이 찍어도 반찬통 글씨·병 모양이 보이도록 1536px까지 남긴다.
// 용량과 API 비용 때문에 그 이상은 줄여서 보낸다 (기획서 3-2, 13-1).
const MAX_WIDTH = 1536;
const JPEG_QUALITY = 0.6;
/** 앨범에서 한 번에 고를 수 있는 사진 수. 사진마다 AI를 한 번씩 부른다. */
export const MAX_PHOTOS = 5;

/** 사진을 분석용 크기로 줄이고 JPEG로 압축한다. */
export async function preparePhoto(uri: string, width: number, height: number, label?: string): Promise<CapturedPhoto> {
  const context = ImageManipulator.manipulate(uri);
  // 웹은 height: null(비율 유지)을 처리하지 못해서 높이를 직접 계산해 넘긴다.
  if (width > MAX_WIDTH) context.resize({ width: MAX_WIDTH, height: Math.round((height * MAX_WIDTH) / width) });
  const image = await context.renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY, base64: true });
  if (!result.base64) throw new Error('사진을 변환하지 못했어요');
  return { uri: result.uri, base64: stripDataUrl(result.base64), mimeType: 'image/jpeg', label };
}

/** 앨범에서 사진을 여러 장 골라 분석용으로 준비한다. 고르지 않으면 false. */
export async function pickPhotosFromLibrary(): Promise<boolean> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: 'images',
    quality: 1,
    allowsMultipleSelection: true,
    selectionLimit: MAX_PHOTOS,
  });
  const assets = result.canceled ? [] : result.assets.slice(0, MAX_PHOTOS);
  if (assets.length === 0) return false;
  setCapturedPhotos(await Promise.all(assets.map((a) => preparePhoto(a.uri, a.width, a.height))));
  return true;
}
