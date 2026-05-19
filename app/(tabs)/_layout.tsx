import React from 'react'
import { Tabs } from 'expo-router'
import { BlurView } from 'expo-blur'
import { StyleSheet, View } from 'react-native'
import { Sparkles, Grid2X2, Wand2, ShoppingBag } from 'lucide-react-native'
import { TARA_PINK, TARA_PINK_LIGHT, TARA_MUTED, RADIUS_FULL } from '@/lib/constants'

type TabIconProps = { color: string; size: number; focused: boolean }
type AnyIcon = React.ComponentType<{ color: string; size: number; strokeWidth?: number }>

const StudioI = Sparkles as AnyIcon
const WardrobeI = Grid2X2 as AnyIcon
const StylistI = Wand2 as AnyIcon
const ShopI = ShoppingBag as AnyIcon

function TabIcon(Icon: AnyIcon) {
  return function TabIconComponent({ color, size, focused }: TabIconProps) {
    return (
      <View style={focused ? styles.activeIconWrap : styles.iconWrap}>
        <Icon color={color} size={size} strokeWidth={focused ? 2 : 1.5} />
      </View>
    )
  }
}

function TabBarBackground() {
  return (
    <BlurView intensity={60} style={StyleSheet.absoluteFill} tint="light">
      <View style={styles.tabBarInner} />
    </BlurView>
  )
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: TARA_PINK,
        tabBarInactiveTintColor: TARA_MUTED,
        tabBarBackground: TabBarBackground,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Studio', tabBarIcon: (p) => TabIcon(StudioI)(p) }} />
      <Tabs.Screen name="wardrobe" options={{ title: 'Wardrobe', tabBarIcon: (p) => TabIcon(WardrobeI)(p) }} />
      <Tabs.Screen name="outfits" options={{ title: 'Stylist', tabBarIcon: (p) => TabIcon(StylistI)(p) }} />
      <Tabs.Screen name="shop" options={{ title: 'Shop', tabBarIcon: (p) => TabIcon(ShopI)(p) }} />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderTopColor: 'rgba(255,255,255,0.6)',
    borderTopWidth: 1,
    elevation: 0,
    height: 64,
  },
  tabBarInner: {
    flex: 1,
    backgroundColor: 'rgba(248,249,255,0.5)',
  },
  tabLabel: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 10,
    letterSpacing: 0.2,
    marginTop: -2,
  },
  tabItem: {
    paddingVertical: 6,
  },
  iconWrap: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  activeIconWrap: {
    paddingHorizontal: 18,
    paddingVertical: 5,
    backgroundColor: TARA_PINK_LIGHT,
    borderRadius: RADIUS_FULL,
  },
})
