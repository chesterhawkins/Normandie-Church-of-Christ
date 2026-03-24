import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";

import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

const isIPad = Platform.OS === "ios" && Platform.isPad;

function NativeTabLayout({ loggedIn }: { loggedIn: boolean }) {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="announcements">
        <Icon sf={{ default: "megaphone", selected: "megaphone.fill" }} />
        <Label>News</Label>
      </NativeTabs.Trigger>
      {loggedIn && (
        <NativeTabs.Trigger name="prayer">
          <Icon sf={{ default: "hands.sparkles", selected: "hands.sparkles.fill" }} />
          <Label>Prayer</Label>
        </NativeTabs.Trigger>
      )}
      <NativeTabs.Trigger name="bulletins">
        <Icon sf={{ default: "doc.text", selected: "doc.text.fill" }} />
        <Label>Bulletins</Label>
      </NativeTabs.Trigger>
      {loggedIn && (
        <NativeTabs.Trigger name="directory">
          <Icon sf={{ default: "person.2", selected: "person.2.fill" }} />
          <Label>Directory</Label>
        </NativeTabs.Trigger>
      )}
      <NativeTabs.Trigger name="bible">
        <Icon sf={{ default: "book", selected: "book.fill" }} />
        <Label>Bible</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="calendar">
        <Icon sf={{ default: "calendar", selected: "calendar" }} />
        <Label>Calendar</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="more">
        <Icon sf={{ default: "ellipsis.circle", selected: "ellipsis.circle.fill" }} />
        <Label>About</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout({ loggedIn }: { loggedIn: boolean }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.tabInactive,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : Colors.background,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: Colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 10,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.background }]} />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="house" tintColor={color} size={22} />
            ) : (
              <Feather name="home" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="announcements"
        options={{
          title: "News",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="megaphone" tintColor={color} size={22} />
            ) : (
              <Feather name="bell" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="prayer"
        options={{
          href: loggedIn ? undefined : null,
          title: "Prayer",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="hands.sparkles" tintColor={color} size={22} />
            ) : (
              <Feather name="heart" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="bulletins"
        options={{
          title: "Bulletins",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="doc.text" tintColor={color} size={22} />
            ) : (
              <Feather name="file-text" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="directory"
        options={{
          href: loggedIn ? undefined : null,
          title: "Directory",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person.2" tintColor={color} size={22} />
            ) : (
              <Feather name="users" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="bible"
        options={{
          href: Platform.OS === "android" ? null : undefined,
          title: "Bible",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="book" tintColor={color} size={22} />
            ) : (
              <Feather name="book-open" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          href: Platform.OS === "android" ? null : undefined,
          title: "Calendar",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="calendar" tintColor={color} size={22} />
            ) : (
              <Feather name="calendar" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "About",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="ellipsis.circle" tintColor={color} size={22} />
            ) : (
              <Feather name="menu" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: Colors.background }} />;
  }

  const loggedIn = !!user;

  if (!isIPad && isLiquidGlassAvailable()) {
    return <NativeTabLayout loggedIn={loggedIn} />;
  }
  return <ClassicTabLayout loggedIn={loggedIn} />;
}
