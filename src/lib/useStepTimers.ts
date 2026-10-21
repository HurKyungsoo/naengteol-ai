import { useEffect, useState } from 'react';
import { Vibration } from 'react-native';

/** 단계 하나의 타이머. 끝나는 시각으로 남은 시간을 계산해서, 앱이 잠깐 멈췄다 돌아와도 어긋나지 않는다. */
export type StepTimer = {
  index: number;
  total: number;
  endAt: number;
  /** 끝났을 때 진동을 이미 울렸는지 */
  rang: boolean;
};

// 끝나면 세 번 길게 울린다 (부엌에서 손을 떼고 있어도 알 수 있게)
const RING = [0, 600, 300, 600, 300, 600];

/**
 * 조리 모드의 단계 타이머. 찌개를 끓이면서 다른 재료를 볶는 것처럼 여러 단계 타이머를 동시에 돌릴 수 있다.
 * 앱이 켜져 있는 동안만 울린다 (조리 모드는 화면이 꺼지지 않게 해 둔다).
 */
export function useStepTimers() {
  const [timers, setTimers] = useState<StepTimer[]>([]);
  const [now, setNow] = useState(() => Date.now());

  const ticking = timers.some((t) => !t.rang);
  useEffect(() => {
    if (!ticking) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (timers.some((x) => !x.rang && x.endAt <= t)) {
        Vibration.vibrate(RING);
        setTimers((prev) => prev.map((x) => (x.endAt <= t ? { ...x, rang: true } : x)));
      }
    }, 250);
    return () => clearInterval(id);
  }, [ticking, timers]);

  const start = (index: number, seconds: number) => {
    const t = Date.now();
    setNow(t);
    setTimers((prev) => [
      ...prev.filter((x) => x.index !== index),
      { index, total: seconds, endAt: t + seconds * 1000, rang: false },
    ]);
  };

  const stop = (index: number) => {
    Vibration.cancel();
    setTimers((prev) => prev.filter((x) => x.index !== index));
  };

  /** 남은 초 (끝났으면 0) */
  const remaining = (timer: StepTimer) => Math.max(0, Math.ceil((timer.endAt - now) / 1000));

  /** 남은 비율 (1 → 0). 막대 길이에 쓴다 */
  const fraction = (timer: StepTimer) => Math.max(0, Math.min(1, (timer.endAt - now) / (timer.total * 1000)));

  const find = (index: number) => timers.find((x) => x.index === index);

  return { timers, start, stop, remaining, fraction, find };
}

/** 265 → "4:25" */
export function formatSeconds(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
