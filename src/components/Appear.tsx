import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';

/** 기기의 "동작 줄이기" 설정. 켜져 있으면 애니메이션 없이 바로 보여 준다. */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduce)
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => sub.remove();
  }, []);
  return reduce;
}

type Props = {
  /** true가 될 때마다 처음부터 다시 나타난다 */
  play: boolean;
  /** pop: 작게 시작해 튀어나온다 · rise: 아래에서 올라온다 · slide: 화면 아래에서 밀려 올라온다 */
  kind?: 'pop' | 'rise' | 'slide';
  delay?: number;
  /** 나타난 뒤 위아래로 천천히 떠 있는다 */
  float?: boolean;
  /** 나타난 뒤 살짝 커졌다 작아지기를 반복한다 */
  pulse?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

/** 온보딩처럼 화면이 열릴 때 요소를 하나씩 등장시킨다. */
export function Appear({ play, kind = 'rise', delay = 0, float = false, pulse = false, style, children }: Props) {
  const reduce = useReduceMotion();
  const [progress] = useState(() => new Animated.Value(0));
  const [loop] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduce) {
      progress.setValue(1);
      return;
    }
    if (!play) return;

    progress.setValue(0);
    loop.setValue(0);
    const enter =
      kind === 'pop'
        ? Animated.spring(progress, { toValue: 1, delay, friction: 6, tension: 120, useNativeDriver: true })
        : Animated.timing(progress, {
            toValue: 1,
            delay,
            duration: kind === 'slide' ? 380 : 450,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          });
    enter.start();

    if (!float && !pulse) return () => enter.stop();
    const half = float ? 1600 : 800;
    const repeat = Animated.loop(
      Animated.sequence([
        Animated.timing(loop, { toValue: 1, duration: half, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(loop, { toValue: 0, duration: half, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    // 등장이 끝난 뒤에 반복을 시작한다.
    const timer = setTimeout(() => repeat.start(), delay + 500);
    return () => {
      clearTimeout(timer);
      enter.stop();
      repeat.stop();
    };
  }, [play, reduce, kind, delay, float, pulse, progress, loop]);

  const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' });
  const enterTransform =
    kind === 'pop'
      ? { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }
      : { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [kind === 'slide' ? 320 : 16, 0] }) };
  const loopTransform = float
    ? { translateY: loop.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }
    : { scale: loop.interpolate({ inputRange: [0, 1], outputRange: [1, pulse ? 1.08 : 1] }) };

  return (
    <Animated.View style={[style, { opacity: kind === 'slide' ? 1 : opacity, transform: [enterTransform, loopTransform] }]}>
      {children}
    </Animated.View>
  );
}
