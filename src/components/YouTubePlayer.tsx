import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

/**
 * 유튜브 공식 임베드 플레이어 (앱). 웹은 YouTubePlayer.web.tsx.
 * 유튜브는 임베드 요청에 출처(Referer)가 없으면 재생을 막기 때문에 html + baseUrl로 출처를 붙인다.
 */
export function YouTubePlayer({ videoId }: { videoId: string }) {
  const src = `https://www.youtube.com/embed/${videoId}?playsinline=1&autoplay=1&rel=0`;
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0;height:100%;background:#000}iframe{border:0;width:100%;height:100%}</style></head>
<body><iframe src="${src}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen
referrerpolicy="strict-origin-when-cross-origin"></iframe></body></html>`;
  return (
    <WebView
      style={styles.player}
      source={{ html, baseUrl: 'https://naengteol.app' }}
      allowsInlineMediaPlayback
      allowsFullscreenVideo
      mediaPlaybackRequiresUserAction={false}
      javaScriptEnabled
      scrollEnabled={false}
    />
  );
}

const styles = StyleSheet.create({
  player: {
    flex: 1,
    backgroundColor: '#000',
  },
});
