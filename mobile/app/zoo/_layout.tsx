import { Stack } from 'expo-router';

export default function ZooLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#FFF4E0' },
      }}
    />
  );
}
