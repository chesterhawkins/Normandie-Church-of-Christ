import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { signUp } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await signUp(email.trim(), password, firstName.trim(), lastName.trim());
      router.dismissAll();
    } catch (e: any) {
      const msg = e?.code === "auth/email-already-in-use"
        ? "An account with this email already exists."
        : e?.message || "Registration failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Feather name="user-plus" size={30} color={Colors.accent} />
          </View>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Normandie Church of Christ</Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={16} color={Colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <View style={styles.nameRow}>
            <View style={[styles.fieldGroup, styles.nameField]}>
              <Text style={styles.label}>First Name</Text>
              <View style={styles.inputRow}>
                <Feather name="user" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="First"
                  placeholderTextColor={Colors.textMuted}
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCorrect={false}
                  autoCapitalize="words"
                />
              </View>
            </View>
            <View style={[styles.fieldGroup, styles.nameField]}>
              <Text style={styles.label}>Last Name</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, { paddingLeft: 0 }]}
                  placeholder="Last"
                  placeholderTextColor={Colors.textMuted}
                  value={lastName}
                  onChangeText={setLastName}
                  autoCorrect={false}
                  autoCapitalize="words"
                />
              </View>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputRow}>
              <Feather name="mail" size={18} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputRow}>
              <Feather name="lock" size={18} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="At least 6 characters"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={Colors.textMuted} />
              </Pressable>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [styles.primaryBtn, { opacity: pressed ? 0.85 : 1 }]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.textInverse} />
            ) : (
              <Text style={styles.primaryBtnText}>Create Account</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Pressable onPress={() => router.replace("/(auth)/login")}>
            <Text style={styles.link}>Sign In</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { flexGrow: 1, padding: 24, paddingTop: 40 },
  header: { alignItems: "center", marginBottom: 32 },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 28, color: Colors.text, marginBottom: 6 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 16, color: Colors.textSecondary },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.dangerLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.danger, flex: 1 },
  form: { gap: 18, marginBottom: 32 },
  nameRow: { flexDirection: "row", gap: 12 },
  nameField: { flex: 1 },
  fieldGroup: { gap: 6 },
  label: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.text },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 16, color: Colors.text, height: "100%" },
  eyeBtn: { padding: 4 },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  primaryBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.textInverse },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  footerText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary },
  link: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.primary },
});
