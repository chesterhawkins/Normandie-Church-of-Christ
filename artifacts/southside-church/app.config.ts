import { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Normandie Church of Christ",
  slug: "normandie-church-of-christ",
  version: "2.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "normandie-church",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  splash: {
    image: "./assets/images/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#FFFFFF",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.ojeelabs.normandiecoc",
    googleServicesFile: "./GoogleService-Info.plist",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoadsInWebContent: true,
      },
    },
  },
  android: {
    package: "com.ojeelabs.normandiecoc",
    googleServicesFile: "./google-services.json",
    usesCleartextTraffic: true,
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY ?? "",
      },
    },
  },
  web: {
    favicon: "./assets/images/icon.png",
  },
  plugins: [
    "./plugins/withCxx20",
    [
      "expo-notifications",
      {
        icon: "./assets/images/icon.png",
        color: "#8B1A2C",
        defaultChannel: "default",
      },
    ],
    [
      "expo-router",
      {
        origin: "https://replit.com/",
      },
    ],
    "expo-font",
    "expo-web-browser",
    "@react-native-community/datetimepicker",
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    eas: {
      projectId: "913dd18f-ff13-4c87-a17d-aea3d8db2e8a",
    },
  },
  owner: "ojeelabs",
};

export default config;
