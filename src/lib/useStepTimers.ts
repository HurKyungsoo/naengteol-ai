import { useEffect, useRef, useState } from 'react';
import { Vibration } from 'react-native';

import { cancelTimerNotification, scheduleTimerNotification } from '@/lib/timerNotifications';

/** 단계 하나의 타이머. 끝나는 시각으로 남은 시간을 계산해서, 앱이 잠깐 멈췄다 돌아와도 어긋나지 않는다. */
export type StepTimer = {
  index: number;
  total: number;
  endAt: number;
  /** 끝났을 때 진동을 이미 울렸는지 */
  rang: boolean;
  /** 알림 제목 ("3단계 채소 넣기") */
  label: string;
  /** 앱 밖에 있을 때 울릴 예약 알림 */
  notificationId?: string;
};

// 끝나면 세 번 길게 울린다 (부엌에서 손을 떼고 있어도 알 수 있게)
const RING = [0, 600, 300, 600, 300, 600];

/** 이벤트 처리에서만 부르는 현재 시각 (렌더 중에는 now 상태를 쓴다) */
const clock = () => Date.now();

// 앱 밖에 있다 돌아왔을 때 이미 알림으로 알린 타이머는 다시 진동하지 않는다
const LATE_MS = 2000;

/**
 * 조리 모드의 단계 타이머. 찌개를 끓이면서 다른 재료를 볶는 것처럼 여러 단계 타이머를 동시에 돌릴 수 있다.
 * 앱이 켜져 있으면 진동으로, 앱 밖에 있으면 예약해 둔 알림으로 끝났음을 알린다.
 * 조리 화면을 나가면 타이머와 알림도 함께 없어진다.
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
        if (timers.some((x) => !x.rang && x.endAt <= t && t - x.endAt < LATE_MS)) Vibration.vibrate(RING);
        setTimers((prev) => prev.map((x) => (x.endAt <= t ? { ...x, rang: true } : x)));
      }
    }, 250);
    return () => clearInterval(id);
  }, [ticking, timers]);

  // 조리 화면을 나가면 남은 알림을 지운다
  const latest = useRef(timers);
  useEffect(() => {
    latest.current = timers;
  }, [timers]);
  useEffect(() => () => latest.current.forEach((x) => cancelTimerNotification(x.notificationId)), []);

  /** 알림을 예약하고, 예약이 끝나면 그 타이머에 알림 id를 붙인다 (그사이 타이머가 바뀌었으면 알림을 지운다) */
  const notify = (index: number, endAt: number, label: string, total: number) => {
    const seconds = Math.round((endAt - clock()) / 1000);
    scheduleTimerNotification(`${label} 끝났어요`, `${formatSeconds(total)} 타이머가 다 됐어요. 불을 확인하세요.`, seconds)
      .then((id) => {
        if (!id) return;
        if (!latest.current.some((x) => x.index === index && x.endAt === endAt)) return cancelTimerNotification(id);
        setTimers((prev) => prev.map((x) => (x.index === index && x.endAt === endAt ? { ...x, notificationId: id } : x)));
      })
      .catch((e) => console.warn('타이머 알림을 예약하지 못했습니다', e));
  };

  const start = (index: number, seconds: number, label: string) => {
    const t = clock();
    const endAt = t + seconds * 1000;
    setNow(t);
    cancelTimerNotification(find(index)?.notificationId);
    setTimers((prev) => [...prev.filter((x) => x.index !== index), { index, total: seconds, endAt, rang: false, label }]);
    notify(index, endAt, label, seconds);
  };

  const stop = (index: number) => {
    Vibration.cancel();
    cancelTimerNotification(find(index)?.notificationId);
    setTimers((prev) => prev.filter((x) => x.index !== index));
  };

  /** 1분 더 (덜 익었을 때) */
  const addMinute = (index: number) => {
    const timer = find(index);
    if (!timer) return;
    const endAt = timer.endAt + 60_000;
    const total = timer.total + 60;
    cancelTimerNotification(timer.notificationId);
    setTimers((prev) =>
      prev.map((x) => (x.index === index ? { ...x, endAt, total, notificationId: undefined } : x)),
    );
    notify(index, endAt, timer.label, total);
  };

  /** 남은 초 (끝났으면 0) */
  const remaining = (timer: StepTimer) => Math.max(0, Math.ceil((timer.endAt - now) / 1000));

  /** 남은 비율 (1 → 0). 막대 길이에 쓴다 */
  const fraction = (timer: StepTimer) => Math.max(0, Math.min(1, (timer.endAt - now) / (timer.total * 1000)));

  const find = (index: number) => timers.find((x) => x.index === index);

  return { timers, start, stop, addMinute, remaining, fraction, find };
}

/** 265 → "4:25" */
export function formatSeconds(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
