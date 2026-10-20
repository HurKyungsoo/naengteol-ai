import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { YouTubePlayer } from '@/components/YouTubePlayer';
import { formatDuration, type RecipeVideo } from '@/lib/video';
import { colors, radius, spacing } from '@/theme';

/** 참고 영상 카드. 처음엔 썸네일만 보여 주고, 누르면 그 자리에서 유튜브 플레이어로 재생한다. */
export function RecipeVideoCard({ video }: { video: RecipeVideo }) {
  const [playing, setPlaying] = useState(false);

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.title}>참고 영상</Text>
        <View style={styles.badge}>
          <Ionicons name="logo-youtube" size={12} color="#FF0033" />
          <Text style={styles.badgeText}>YouTube</Text>
        </View>
      </View>
      <View style={styles.frame}>
        {playing ? (
          <YouTubePlayer videoId={video.videoId} />
        ) : (
          <Pressable
            style={styles.thumbButton}
            onPress={() => setPlaying(true)}
            accessibilityRole="button"
            accessibilityLabel={`참고 영상 재생: ${video.title}`}>
            <Image
              source={{ uri: `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg` }}
              style={styles.thumb}
              resizeMode="cover"
            />
            <View style={styles.play}>
              <Ionicons name="play" size={26} color="#fff" style={styles.playIcon} />
            </View>
            <Text style={styles.duration}>{formatDuration(video.durationS)}</Text>
          </Pressable>
        )}
      </View>
      <Text style={styles.videoTitle} numberOfLines={2}>
        {video.title}
      </Text>
      <Text style={styles.caption}>
        {video.channel} · 레시피 이름으로 찾은 영상이라 재료·순서가 다를 수 있어요. 유튜브 공식 플레이어로 재생돼요.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeText: {
    fontSize: 11,
    color: colors.textSoft,
  },
  frame: {
    aspectRatio: 16 / 9,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  thumbButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 웹에서 absoluteFill만 주면 확대돼 잘리므로 크기를 직접 준다 (RecipeImage와 같음)
  thumb: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  play: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    marginLeft: 3,
  },
  duration: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  videoTitle: {
    marginTop: spacing.sm,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  caption: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 16,
    color: colors.textMuted,
  },
});
