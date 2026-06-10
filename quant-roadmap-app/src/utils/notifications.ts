import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function requestPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const granted = await requestPermission();
  if (!granted) return;

  // Morning daily — 7:30 AM
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🎯 Morning Quant Session',
      body: 'Optigames + 3 probability puzzles. Streak on the line! 🔥',
      data: { screen: 'Timer' },
    },
    trigger: {
      hour: 7,
      minute: 30,
      repeats: true,
    } as any,
  });

  // Evening reminder — 8:00 PM
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '📚 Evening Study Block',
      body: "One Pomodoro = 15 XP. Don't break the streak!",
      data: { screen: 'Timer' },
    },
    trigger: {
      hour: 20,
      minute: 0,
      repeats: true,
    } as any,
  });

  // Weekend deep work — Saturday 10 AM
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🧠 Weekend Deep Work',
      body: 'Saturday grind session — your future self will thank you 💎',
      data: { screen: 'Roadmap' },
    },
    trigger: {
      weekday: 7,
      hour: 10,
      minute: 0,
      repeats: true,
    } as any,
  });
}

export async function sendAchievementNotification(title: string, desc: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `🏆 Achievement Unlocked!`,
      body: `${title} — ${desc}`,
      sound: true,
    },
    trigger: null,
  });
}

export async function sendStreakNotification(streak: number) {
  if (streak % 7 === 0) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🔥 ${streak}-Day Streak!`,
        body: `Absolute machine. Keep going!`,
      },
      trigger: null,
    });
  }
}
