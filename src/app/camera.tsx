import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { goBack } from '@/components/ScreenHeader';
import { pickPhotoFromLibrary, preparePhoto } from '@/lib/pickPhoto';
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
      const photo = await cameraRef.current.takePictureAsync({ quality: 1 });
      if (!photo?.uri) throw new Error('사진 데이터가 없어요');
      await preparePhoto(photo.uri, photo.width);
      router.replace('/analysis');
    } catch (e) {
      setError(e instanceof Error ? e.message : '촬영에 실패했어요');
      setBusy(false);
    }
  };

  const fromLibrary = async () => {
    if (await pickPhotoFromLibrary()) router.replace('/analysis');
  };

  // 권한을 아직 받지 못했으면 촬영 화면 대신 안내 화면 전체를 보여 준다.
  if (permission && !permission.granted) {
    return (
      <PermissionScreen
        canAskAgain={permission.canAskAgain}
        onAllow={requestPermission}
        onLibrary={fromLibrary}
      />
    );
  }

  const body = !permission ? (
    <ActivityIndicator color={colors.onInk} />
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

/**
 * 카메라 권한 안내. 요청 전에는 사진을 어디에 쓰는지 먼저 알리고,
 * 한 번 거절해서 다시 물을 수 없으면 앱 설정으로 바로 보내 준다.
 */
function PermissionScreen({
  canAskAgain,
  onAllow,
  onLibrary,
}: {
  canAskAgain: boolean;
  onAllow: () => void;
  onLibrary: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.xl }]}>
      <Pressable style={styles.permissionBack} onPress={goBack} hitSlop={10} accessibilityLabel="닫기">
        <Ionicons name="chevron-back" size={26} color={colors.onInk} />
      </Pressable>

      <View style={styles.permission}>
        <View style={styles.permissionIcon}>
          <Ionicons name={canAskAgain ? 'camera-outline' : 'lock-closed-outline'} size={40} color={colors.onInk} />
        </View>
        <Text style={styles.permissionTitle}>
          {canAskAgain ? '냉장고를 찍으면\n재료를 찾아 드려요' : '카메라 권한이 꺼져 있어요'}
        </Text>
        <Text style={styles.permissionText}>
          {canAskAgain
            ? '사진을 찍으려면 카메라 권한이 필요해요.'
            : '설정 › 권한 › 카메라에서 허용으로 바꾸면\n바로 찍을 수 있어요.'}
        </Text>

        {canAskAgain && (
          <View style={styles.privacy}>
            <View style={styles.privacyRow}>
              <Ionicons name="shield-checkmark-outline" size={18} color={PERMISSION_SOFT} />
              <Text style={styles.privacyText}>
                사진은 재료 인식에만 쓰여요. Google Gemini로 분석하고 앱 서버에는 저장하지 않아요.
              </Text>
            </View>
            <View style={styles.privacyRow}>
              <Ionicons name="person-outline" size={18} color={PERMISSION_SOFT} />
              <Text style={styles.privacyText}>사람 얼굴이나 개인정보가 찍히지 않게 해 주세요.</Text>
            </View>
            <Pressable
              onPress={() => router.push({ pathname: '/info', params: { topic: 'terms' } })}
              hitSlop={8}
              accessibilityRole="link">
              <Text style={styles.privacyLink}>개인정보처리방침 보기</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View style={styles.permissionActions}>
        <Pressable
          style={({ pressed }) => [styles.permissionButton, pressed && styles.pressed]}
          onPress={canAskAgain ? onAllow : () => Linking.openSettings()}
          accessibilityRole="button">
          <Text style={styles.permissionButtonText}>{canAskAgain ? '카메라 허용하기' : '설정 열기'}</Text>
        </Pressable>
        <Pressable style={styles.permissionLinkButton} onPress={onLibrary} accessibilityRole="button">
          <Text style={styles.permissionLink}>{canAskAgain ? '앨범에서 고르기' : '카메라 없이 앨범에서 고르기'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

// 검은 바탕 위 보조 글자색 (흰 바탕의 textSoft에 해당)
const PERMISSION_SOFT = '#C9C9C6';

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
  permissionBack: {
    marginLeft: spacing.md,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permission: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xxl,
  },
  permissionIcon: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: '#2A2A29',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionTitle: {
    color: colors.onInk,
    fontSize: 22,
    lineHeight: 31,
    fontWeight: '700',
    textAlign: 'center',
  },
  permissionText: {
    marginTop: -spacing.sm,
    color: PERMISSION_SOFT,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  privacy: {
    alignSelf: 'stretch',
    padding: spacing.lg,
    gap: 10,
    borderRadius: radius.lg - 4,
    backgroundColor: '#1F1F1E',
  },
  privacyRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  privacyText: {
    flex: 1,
    color: '#E5E5E2',
    fontSize: 13,
    lineHeight: 20,
  },
  privacyLink: {
    marginLeft: 28,
    color: PERMISSION_SOFT,
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  permissionActions: {
    paddingHorizontal: spacing.xl,
    gap: spacing.xs,
  },
  permissionButton: {
    height: 54,
    borderRadius: radius.pill,
    backgroundColor: colors.onInk,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionButtonText: {
    color: colors.ink,
    fontWeight: '700',
    fontSize: 16,
  },
  permissionLinkButton: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionLink: {
    color: '#E5E5E2',
    fontSize: 14,
  },
  pressed: {
    opacity: 0.7,
  },
});
