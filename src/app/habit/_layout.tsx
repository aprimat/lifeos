import { Stack } from "expo-router";

import { useColors } from "@/hooks/use-theme";

export default function GroupLayout() {
  const c = useColors();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.background } }} />;
}
