import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/button';
import { Row } from '@/components/card';
import { TextField } from '@/components/controls';
import { Banner, Field, PageTitle } from '@/components/layout';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { useStore } from '@/data/store';
import { spacing } from '@/theme/tokens';

/** Shared sign-in / sign-up form (local, on-device accounts for now). */
export function AuthForm({ mode }: { mode: 'signIn' | 'signUp' }) {
  const signUp = useStore((s) => s.signUp);
  const signIn = useStore((s) => s.signIn);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isUp = mode === 'signUp';

  const submit = async () => {
    setError(null);
    if (isUp && password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    const err = isUp ? await signUp({ name, email, password }) : await signIn(email, password);
    setBusy(false);
    if (err) setError(err);
    // On success the root layout redirects away from (auth).
  };

  return (
    <Screen
      back
      title={isUp ? 'Create account' : 'Sign in'}
      footer={
        <View style={{ gap: spacing.sm }}>
          <Button
            title={isUp ? 'Create account' : 'Sign in'}
            onPress={submit}
            loading={busy}
            disabled={!email || !password || (isUp && !name)}
            testID="auth-submit"
          />
          <Row justify="center" gap={spacing.xs}>
            <Text variant="bodyMd" tone="secondary">
              {isUp ? 'Already have an account?' : 'New to LifeOS?'}
            </Text>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={isUp ? 'Sign in' : 'Create an account'}
              hitSlop={12}
              onPress={() => router.replace(isUp ? '/sign-in' : '/sign-up')}>
              <Text variant="labelLg" tone="accent">
                {isUp ? 'Sign in' : 'Create an account'}
              </Text>
            </Pressable>
          </Row>
        </View>
      }>
      <PageTitle
        title={isUp ? 'Create your account' : 'Welcome back'}
        subtitle={
          isUp
            ? 'Your goals, habits and reflections stay private to you.'
            : 'Sign in to continue where you left off.'
        }
      />
      {isUp ? (
        <Field label="Name">
          <TextField
            value={name}
            onChangeText={(t) => { setName(t); setError(null); }}
            placeholder="Your first name"
            autoComplete="name"
            textContentType="name"
            accessibilityLabel="Name"
            testID="auth-name"
          />
        </Field>
      ) : null}
      <Field label="Email">
        <TextField
          value={email}
          onChangeText={(t) => { setEmail(t); setError(null); }}
          placeholder="you@example.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          accessibilityLabel="Email"
          testID="auth-email"
        />
      </Field>
      <Field label="Password" hint={isUp ? 'At least 8 characters.' : undefined}>
        <TextField
          value={password}
          onChangeText={(t) => { setPassword(t); setError(null); }}
          placeholder="Password"
          secureTextEntry
          autoCapitalize="none"
          autoComplete={isUp ? 'new-password' : 'current-password'}
          textContentType={isUp ? 'newPassword' : 'password'}
          accessibilityLabel="Password"
          testID="auth-password"
          onSubmitEditing={isUp ? undefined : submit}
        />
      </Field>
      {isUp ? (
        <Field label="Confirm password">
          <TextField
            value={confirm}
            onChangeText={(t) => { setConfirm(t); setError(null); }}
            placeholder="Repeat password"
            secureTextEntry
            autoCapitalize="none"
            textContentType="newPassword"
            accessibilityLabel="Confirm password"
            testID="auth-confirm"
            onSubmitEditing={submit}
          />
        </Field>
      ) : null}
      {error ? (
        <Text variant="bodyMd" tone="error" accessibilityLiveRegion="polite" testID="auth-error">
          {error}
        </Text>
      ) : null}
      <Banner
        icon="lock-outline"
        title="Saved on this device"
        body="For now your account and data live only on this phone. Nothing is shared or tracked."
      />
    </Screen>
  );
}
