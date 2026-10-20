import * as ImagePicker from 'expo-image-picker';

import { setCapturedPhoto } from '@/lib/photoSession';

/** 앨범에서 사진을 골라 분석용으로 보관한다. 고르지 않으면 false. */
export async function pickPhotoFromLibrary(): Promise<boolean> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: 'images',
    base64: true,
    quality: 0.5,
  });
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset?.base64) return false;
  setCapturedPhoto({ uri: asset.uri, base64: asset.base64, mimeType: asset.mimeType ?? 'image/jpeg' });
  return true;
}
