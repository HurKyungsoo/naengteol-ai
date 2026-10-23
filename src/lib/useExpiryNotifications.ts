import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { addDays, daysLeft, isEstimated, isTracked, needsCheck } from '@/lib/expiry';
import { TIMER_KIND } from '@/lib/timerNotifications';
import type { PantryItem } from '@/types';

// 소비기한 알림은 기기 안에서 예약하는 로컬 알림이다 (Expo Go에서도 된다). 웹은 지원하지 않는다.
const SUPPORTED = Platform.OS !== 'web';
const CHANNEL_ID = 'expiry';
/** 저녁 메뉴를 고를 즈음 알린다 */
const NOTIFY_HOUR = 17;
/** 며칠 뒤 알림까지 미리 예약할지. 앱을 열 때마다 다시 예약한다. */
const SCHEDULE_DAYS = 7;

if (SUPPORTED) {
  Notifications.setNotificationHandler({
    // 조리 타이머는 앱이 켜져 있으면 조리 화면이 직접 진동으로 알려 주니, 알림은 앱 밖에 있을 때만 보인다.
    handleNotification: async (n) => {
      const show = n.request.content.data?.kind !== TIMER_KIND;
      return { shouldShowBanner: show, shouldShowList: show, shouldPlaySound: false, shouldSetBadge: false };
    },
  });
}

/** 받침이 있으면 "이", 없으면 "가" */
function subjectParticle(word: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return '이(가)';
  return code % 28 === 0 ? '가' : '이';
}

function message(items: PantryItem[], at: number): { title: string; body: string } {
  const [first] = items;
  const days = daysLeft(first, at);
  const when = days <= 0 ? '오늘까지' : '내일까지';
  const title =
    items.length === 1
      ? `${first.name}${subjectParticle(first.name)} ${when}예요`
      : `${first.name} 외 ${items.length - 1}개가 곧 상해요`;
  return { title, body: '오늘 저녁에 써 볼까요? 이 재료로 만들 레시피를 찾아 드려요.' };
}

async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    // 안드로이드 13부터는 채널이 하나 있어야 권한 창이 뜬다.
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: '소비기한 알림',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/** 알림 권한을 아직 한 번도 묻지 않았는지. 웹은 알림을 지원하지 않아 false. */
export async function canAskNotifications(): Promise<boolean> {
  if (!SUPPORTED) return false;
  const current = await Notifications.getPermissionsAsync();
  return current.status === 'undetermined' && current.canAskAgain;
}

/** 시스템 알림 권한 창을 띄운다. 분석 결과 화면처럼 왜 필요한지 먼저 설명한 뒤에 부른다. */
export async function askNotifications(): Promise<boolean> {
  if (!SUPPORTED) return false;
  return ensurePermission();
}

async function reschedule(pantry: PantryItem[], enabled: boolean): Promise<void> {
  // 소비기한 알림만 지우고 다시 만든다. 돌아가는 조리 타이머 알림은 남겨 둔다.
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.content.data?.kind !== TIMER_KIND)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  if (!enabled || pantry.length === 0) return;
  if (!(await ensurePermission())) return;

  const now = Date.now();

  // 산 날을 몰라 기한을 추정한 재료는 날짜별 알림 대신, 다음 알림 시각에 한 번 확인을 부탁한다.
  const unchecked = needsCheck(pantry);
  if (unchecked.length > 0) {
    const at = new Date(now);
    at.setHours(NOTIFY_HOUR, 0, 0, 0);
    if (at.getTime() <= now) at.setDate(at.getDate() + 1);
    const [first] = unchecked;
    await Notifications.scheduleNotificationAsync({
      content: {
        title:
          unchecked.length === 1
            ? `${first.name}${subjectParticle(first.name)} 언제 산 건지 알려 주세요`
            : `${first.name} 외 ${unchecked.length - 1}개, 언제 산 건지 알려 주세요`,
        body: '대충 골라 주시면 상하기 전에 알려 드릴게요.',
        data: { url: '/pantry' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL_ID },
    });
  }

  for (let d = 0; d < SCHEDULE_DAYS; d++) {
    const at = new Date(addDays(now, d));
    at.setHours(NOTIFY_HOUR, 0, 0, 0);
    if (at.getTime() <= now) continue;
    // 그날 기준으로 오늘·내일까지인 재료 (이미 지난 재료는 냉장고 화면에서 보여 준다)
    const items = pantry
      .filter((p) => {
        if (!isTracked(p) || isEstimated(p)) return false;
        const left = daysLeft(p, at.getTime());
        return left === 0 || left === 1;
      })
      .sort((a, b) => daysLeft(a, at.getTime()) - daysLeft(b, at.getTime()));
    if (items.length === 0) continue;
    await Notifications.scheduleNotificationAsync({
      content: { ...message(items, at.getTime()), data: { url: '/pantry' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL_ID },
    });
  }
}

/** 냉장고 재료가 바뀔 때마다 앞으로 일주일치 소비기한 알림을 다시 예약한다. */
export function useExpiryNotifications(pantry: PantryItem[], enabled: boolean, loaded: boolean) {
  useEffect(() => {
    if (!SUPPORTED || !loaded) return;
    reschedule(pantry, enabled).catch((e) => console.warn('소비기한 알림을 예약하지 못했습니다', e));
  }, [pantry, enabled, loaded]);

  // 소비기한 알림을 누르면 냉장고 탭으로 간다. (조리 타이머 알림은 앱만 열면 조리 화면이 그대로 있다)
  useEffect(() => {
    if (!SUPPORTED) return;
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      if (r.notification.request.content.data?.kind !== TIMER_KIND) router.navigate('/pantry');
    });
    return () => sub.remove();
  }, []);
}
