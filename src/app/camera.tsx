import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { goBack } from '@/components/ScreenHeader';
import { stripDataUrl } from '@/lib/analyze';
import { setCapturedPhoto } from '@/lib/photoSession';
import { pickPhotoFromLibrary } from '@/lib/pickPhoto';
import { colors, radius, spacing } from '@/theme';

export default function CameraScreen() {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const capture = async () => {
    if (!cameraRef.current || !ready || busy) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 });
      if (!photo?.base64) throw new Error('사진 데이터가 없어요');
      setCapturedPhoto({ uri: photo.uri, base64: stripDataUrl(photo.base64), mimeType: 'image/jpeg' });
      router.replace('/analysis');
    } catch (e) {
      setError(e instanceof Error ? e.message : '촬영에 실패했어요');
      setBusy(false);
    }
  };

  const fromLibrary = async () => {
    if (await pickPhotoFromLibrary()) router.replace('/analysis');
  };

  const body = !permission ? (
    <ActivityIndicator color={colors.onInk} />
  ) : !permission.granted ? (
    <View style={styles.permission}>
      <Ionicons name="camera-outline" size={40} color={colors.onInk} />
      <Text style={styles.permissionText}>냉장고 사진을 찍으려면{'\n'}카메라 권한이 필요해요.</Text>
      {permission.canAskAgain ? (
        <Pressable style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>카메라 허용하기</Text>
        </Pressable>
      ) : (
        <Text style={styles.permissionHint}>설정에서 카메라 권한을 켜 주세요.</Text>
      )}
      <Pressable onPress={fromLibrary} hitSlop={8}>
        <Text style={styles.permissionLink}>앨범에서 고르기</Text>
      </Pressable>
    </View>
  ) : (
    <CameraView
      ref={cameraRef}
      style={StyleSheet.absoluteFill}
      facing={facing}
      onCameraReady={() => setReady(true)}
      onMountError={(e) => setError(e.message)}
    />
  );

  return (
    <View style={styles.screen}>
      <View style={styles.viewfinder}>
        {body}
        {permission?.granted && (
          <View style={[styles.guide, { top: insets.top + 70 }]} pointerEvents="none">
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
          </View>
        )}
      </View>

      <Pressable
        style={[styles.back, { top: insets.top + spacing.sm }]}
        onPress={goBack}
        hitSlop={10}
        accessibilityLabel="닫기">
        <Ionicons name="chevron-back" size={26} color={colors.onInk} />
      </Pressable>
      {permission?.granted && (
        <Text style={[styles.hint, { top: insets.top + spacing.lg }]}>냉장고 안이 잘 보이게 찍어 주세요</Text>
      )}
      {error && <Text style={styles.error}>{error}</Text>}

      <View style={[styles.controls, { paddingBottom: insets.bottom + spacing.xl }]}>
        <Pressable style={styles.sideButton} onPress={fromLibrary} accessibilityLabel="앨범에서 선택">
          <Ionicons name="images-outline" size={24} color={colors.onInk} />
        </Pressable>
        <Pressable
          style={[styles.shutter, (!ready || busy) && styles.shutterDisabled]}
          onPress={capture}
          disabled={!ready || busy}
          accessibilityLabel="촬영">
          {busy ? <ActivityIndicator color={colors.ink} /> : <View style={styles.shutterInner} />}
        </Pressable>
        <Pressable
          style={styles.sideButton}
          onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
          accessibilityLabel="카메라 전환">
          <Ionicons name="camera-reverse-outline" size={26} color={colors.onInk} />
        </Pressable>
      </View>
    </View>
  );
}

const CORNER = 28;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000',
  },
  viewfinder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  guide: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    bottom: spacing.xl,
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 10 },
  tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 10 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 10 },
  br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 10 },
  back: {
    position: 'absolute',
    left: spacing.lg,
  },
  hint: {
    position: 'absolute',
    alignSelf: 'center',
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
  },
  error: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 160,
    color: '#FFB4A8',
    fontSize: 13,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: spacing.xl,
    backgroundColor: '#000',
  },
  sideButton: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  shutter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterDisabled: {
    opacity: 0.5,
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#fff',
  },
  permission: {
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
  },
  permissionText: {
    color: colors.onInk,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: colors.onInk,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    height: 48,
    justifyContent: 'center',
  },
  permissionButtonText: {
    color: colors.ink,
    fontWeight: '700',
    fontSize: 15,
  },
  permissionHint: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  permissionLink: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
