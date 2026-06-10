import React, { useEffect, useRef, createContext, useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Text, View, StyleSheet, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import HomeScreen from './src/screens/HomeScreen';
import RoadmapScreen from './src/screens/RoadmapScreen';
import WeekScreen from './src/screens/WeekScreen';
import TimerScreen from './src/screens/TimerScreen';
import StatsScreen from './src/screens/StatsScreen';
import { useStore } from './src/store/useStore';
import { scheduleAllNotifications } from './src/utils/notifications';

export type RootStackParamList = {
  Tabs: undefined;
  Week: { weekNum: number };
};

export type TabParamList = {
  Home: undefined;
  Roadmap: undefined;
  Timer: undefined;
  Stats: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const StoreContext = createContext<ReturnType<typeof useStore> | null>(null);
export function useAppStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('No store context');
  return ctx;
}

const TAB_ICONS: Record<string, string> = {
  Home: '🏠',
  Roadmap: '🗺️',
  Timer: '🍅',
  Stats: '⭐',
};

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#4D8EF0',
        tabBarInactiveTintColor: '#4A5568',
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>
            {TAB_ICONS[route.name]}
          </Text>
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Roadmap" component={RoadmapScreen} />
      <Tab.Screen name="Timer" component={TimerScreen} />
      <Tab.Screen name="Stats" component={StatsScreen} />
    </Tab.Navigator>
  );
}

function MainNav() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: '#0A0E1A' } }}>
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen
        name="Week"
        component={WeekScreen}
        options={{ presentation: 'modal', cardStyle: { backgroundColor: '#0A0E1A' } }}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  const store = useStore();
  const navRef = useRef<any>(null);

  useEffect(() => {
    scheduleAllNotifications();

    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const screen = response.notification.request.content.data?.screen as string;
      if (screen && navRef.current) {
        navRef.current.navigate(screen);
      }
    });

    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (store.loaded) {
      store.dailyCheckin();
    }
  }, [store.loaded]);

  if (!store.loaded) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>⚡ Loading QuantPath...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StoreContext.Provider value={store}>
          <NavigationContainer ref={navRef} theme={{ dark: true, colors: { background: '#0A0E1A', card: '#0F1629', text: '#E2E8F0', border: '#1E2A3A', primary: '#4D8EF0', notification: '#FF6B6B' } }}>
            <StatusBar style="light" />
            <MainNav />
          </NavigationContainer>
        </StoreContext.Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#0F1629',
    borderTopColor: '#1E2A3A',
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8,
    height: Platform.OS === 'ios' ? 80 : 60,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  loading: {
    flex: 1,
    backgroundColor: '#0A0E1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#4D8EF0',
    fontSize: 18,
    fontWeight: '700',
  },
});
