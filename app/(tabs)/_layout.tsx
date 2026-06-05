import { Tabs } from 'expo-router';
import { Siren, Wrench } from 'lucide-react-native';
import { Colors, Typography } from '@/constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarLabelStyle: {
          fontFamily: 'Inter-Bold',
          fontSize: Typography.fontSizeXs,
        },
        tabBarStyle: {
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          backgroundColor: Colors.surface,
          height: 56,
          paddingBottom: 6,
          paddingTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="driver"
        options={{
          title: 'SOS Panne',
          tabBarIcon: ({ size, color }) => (
            <Siren size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="mechanic"
        options={{
          title: 'Mecanicien',
          tabBarIcon: ({ size, color }) => (
            <Wrench size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
