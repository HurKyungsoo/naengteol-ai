import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// 조리 타이머가 끝날 때 앱 밖에 있어도 알 수 있게 거는 로컬 알림. 웹은 지원하지 않는다.
const SUPPORTED = Platform.OS !== 'web';
const CHANNEL_ID = 'cook-timer';
/** 알림 data.kind. 소비기한 알림을 다시 예약할 때 이 알림은 지우지 않는다. */
export const TIMER_KIND = 'cook-timer';

let channelReady: Promise<unknown> | undefined;

async function ready(): Promise<boolean> {
  if (Platform.OS === 'android') {
    // 타이머는 놓치면 안 되니 소리와 함께 화면 위에 뜨는 채널을 쓴다.
    channelReady ??= Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: '조리 타이머',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 600, 300, 600, 300, 600],
    });
    await channelReady;
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** seconds 뒤에 "3단계 채소 넣기 · 5:00 끝났어요" 알림을 건다. 권한이 없으면 undefined. */
export async function scheduleTimerNotification(title: string, body: string, seconds: number): Promise<string | undefined> {
  if (!SUPPORTED || seconds <= 0) return undefined;
  if (!(await ready())) return undefined;
  return Notifications.scheduleNotificationAsync({
    content: { title, body, sound: 'default', data: { kind: TIMER_KIND } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, channelId: CHANNEL_ID },
  });
}

export function cancelTimerNotification(id: string | undefined) {
  if (!SUPPORTED || !id) return;
  Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
}
