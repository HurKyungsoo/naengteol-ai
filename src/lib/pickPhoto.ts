import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { stripDataUrl } from '@/lib/analyze';
import { setCapturedPhoto } from '@/lib/photoSession';

// AI 분석에는 이 정도 해상도면 충분하다. 용량과 API 비용을 줄이기 위해 줄여서 보낸다 (기획서 3-2, 13-1).
const MAX_WIDTH = 1024;
const JPEG_QUALITY = 0.6;

/** 사진을 분석용 크기로 줄이고 JPEG로 압축해 분석 화면으로 넘길 준비를 한다. */
export async function preparePhoto(uri: string, width: number, height: number): Promise<void> {
  const context = ImageManipulator.manipulate(uri);
  // 웹은 height: null(비율 유지)을 처리하지 못해서 높이를 직접 계산해 넘긴다.
  if (width > MAX_WIDTH) context.resize({ width: MAX_WIDTH, height: Math.round((height * MAX_WIDTH) / width) });
  const image = await context.renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY, base64: true });
  if (!result.base64) throw new Error('사진을 변환하지 못했어요');
  setCapturedPhoto({ uri: result.uri, base64: stripDataUrl(result.base64), mimeType: 'image/jpeg' });
}

/** 앨범에서 사진을 골라 분석용으로 준비한다. 고르지 않으면 false. */
export async function pickPhotoFromLibrary(): Promise<boolean> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 1 });
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return false;
  await preparePhoto(asset.uri, asset.width, asset.height);
  return true;
}
