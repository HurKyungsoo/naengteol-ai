/** 유튜브 공식 임베드 플레이어 (웹). 앱은 YouTubePlayer.tsx. */
export function YouTubePlayer({ videoId }: { videoId: string }) {
  return (
    <iframe
      src={`https://www.youtube.com/embed/${videoId}?playsinline=1&autoplay=1&rel=0`}
      title="YouTube video"
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
      style={{ border: 0, width: '100%', height: '100%' }}
    />
  );
}
