import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, View } from 'react-native';

import { DEV_TOOLS } from '@/config/flags';
import { Button } from '@/components/button';
import { Divider, Row } from '@/components/card';
import { ChipGroup, Group, ListRow, SegmentedControl, TextField, TimePicker, ToggleRow } from '@/components/controls';
import { Icon } from '@/components/icon';
import { Banner, Field, Pill, SectionHeader } from '@/components/layout';
import { Screen } from '@/components/screen';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { FOCUS_AREAS, focusLabel } from '@/copy';
import { updateSettings } from '@/data/actions';
import { loadSampleData } from '@/data/seed';
import { useStore } from '@/data/store';
import { formatTime } from '@/domain/dates';
import type { FocusArea, ThemePreference } from '@/domain/types';
import { useColors } from '@/hooks/use-theme';
import { normalizeEmail, validateEmail } from '@/services/auth';
import { authenticate, biometricAvailability } from '@/services/biometrics';
import { shareExport } from '@/services/export';
import { cancelAllNotifications, requestPermission } from '@/services/notifications';
import { radius, spacing } from '@/theme/tokens';

function confirmAction(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: title, onPress: onConfirm },
  ]);
}

/** Profile & Settings (Stitch: profile_settings, trimmed per plan §3.3). */
export default function SettingsRoute() {
  const c = useColors();
  const user = useStore((s) => s.user);
  const settings = useStore((s) => s.data.settings);
  const updateUser = useStore((s) => s.updateUser);
  const signOut = useStore((s) => s.signOut);
  const deleteAccount = useStore((s) => s.deleteAccount);

  const [profileOpen, setProfileOpen] = useState(false);
  const [areasOpen, setAreasOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [quietEdit, setQuietEdit] = useState<'start' | 'end' | null>(null);
  const [reminderNote, setReminderNote] = useState<string | null>(null);
  const [bio, setBio] = useState<{ available: boolean; reason?: string; label: string }>({ available: false, label: 'Biometric lock' });
  const [exporting, setExporting] = useState<'json' | 'csv' | null>(null);

  useEffect(() => {
    biometricAvailability().then(setBio).catch(() => {});
  }, []);

  if (!user) return null;

  const toggleReminders = async (on: boolean) => {
    setReminderNote(null);
    if (!on) return updateSettings({ remindersEnabled: false });
    const granted = await requestPermission();
    if (granted) updateSettings({ remindersEnabled: true });
    else
      setReminderNote(
        Platform.OS === 'web'
          ? 'Reminders work in the mobile app. Your settings are saved for when you use it.'
          : 'Notifications are turned off for LifeOS. You can allow them in your device settings whenever you like.',
      );
  };

  const toggleBiometric = async (on: boolean) => {
    const ok = await authenticate(on ? 'Turn on app lock' : 'Turn off app lock');
    if (ok) updateSettings({ biometricLock: on });
  };

  const doExport = async (kind: 'json' | 'csv') => {
    setExporting(kind);
    try {
      await shareExport(kind, user, useStore.getState().data);
    } finally {
      setExporting(null);
    }
  };

  const doSignOut = () =>
    confirmAction('Sign out', 'Your data stays saved on this device.', async () => {
      await cancelAllNotifications();
      await signOut();
    });

  return (
    <Screen back title="Profile & settings">
      {/* Profile */}
      <Group>
        <View style={{ padding: spacing.md, gap: spacing.md }}>
          <Row gap={spacing.md}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Text variant="headlineSm" tone="onPrimary">
                {user.name
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((p) => p[0]?.toUpperCase())
                  .join('')}
              </Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="headlineSm">{user.name}</Text>
              <Text variant="bodySm" tone="secondary">
                {user.email}
              </Text>
              <Text variant="labelMd" tone="tertiary">
                Member since {new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
              </Text>
            </View>
            <Button title="Edit" variant="secondary" size="sm" icon="edit" onPress={() => setProfileOpen(true)} accessibilityLabel="Edit profile" />
          </Row>
          <Divider />
          <ListRow
            title="Focus areas"
            subtitle={user.focusAreas.length ? user.focusAreas.map(focusLabel).join(', ') : 'None chosen'}
            icon="tune"
            onPress={() => setAreasOpen(true)}
          />
        </View>
      </Group>

      {/* Reminders */}
      <SectionHeader title="Reminders & quiet hours" />
      <Group>
        <ToggleRow
          title="Gentle reminders"
          subtitle="Only on scheduled days — never on rest days"
          icon="notifications-none"
          value={settings.remindersEnabled}
          onChange={toggleReminders}
        />
        {reminderNote ? (
          <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md }}>
            <Banner icon="info-outline" body={reminderNote} />
          </View>
        ) : null}
        <Divider />
        <ToggleRow
          title="Weekly review reminder"
          subtitle="Monday morning"
          icon="event-note"
          value={settings.weeklyReviewReminder}
          onChange={(v) => updateSettings({ weeklyReviewReminder: v })}
        />
        <Divider />
        <ToggleRow
          title="Quiet hours"
          subtitle="No notifications during this time"
          icon="bedtime"
          value={settings.quietHoursEnabled}
          onChange={(v) => updateSettings({ quietHoursEnabled: v })}
        />
        {settings.quietHoursEnabled ? (
          <>
            <ListRow title="Starts" icon="nights-stay" value={formatTime(settings.quietStart)} onPress={() => setQuietEdit('start')} />
            <ListRow title="Ends" icon="wb-twilight" value={formatTime(settings.quietEnd)} onPress={() => setQuietEdit('end')} />
          </>
        ) : null}
      </Group>
      <Text variant="bodySm" tone="tertiary">
        Set a reminder time for each habit when you create or edit it.
      </Text>

      {/* Appearance */}
      <SectionHeader title="Appearance" />
      <Group>
        <View style={{ padding: spacing.md, gap: spacing.sm }}>
          <Row gap={spacing.md}>
            <Icon name="contrast" size={22} />
            <Text variant="bodyMd">Theme</Text>
          </Row>
          <SegmentedControl<ThemePreference>
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
            value={settings.theme}
            onChange={(v) => updateSettings({ theme: v })}
          />
        </View>
        <Divider />
        <ToggleRow
          title="Reduced motion"
          subtitle="Minimise animations"
          icon="motion-photos-off"
          value={settings.reducedMotion}
          onChange={(v) => updateSettings({ reducedMotion: v })}
        />
        <Divider />
        <ListRow
          title="No streaks"
          subtitle="LifeOS shows consistency, never broken chains."
          icon="do-not-disturb-on"
          right={<Pill label="Always" />}
        />
      </Group>

      {/* Privacy */}
      <SectionHeader title="Privacy & data" />
      <Group>
        <ToggleRow
          title={`App lock (${bio.label})`}
          subtitle={bio.available ? 'Ask to unlock when opening LifeOS' : bio.reason}
          icon="fingerprint"
          value={settings.biometricLock}
          disabled={!bio.available && !settings.biometricLock}
          onChange={toggleBiometric}
        />
        <Divider />
        <ListRow title="Saved on this device" subtitle="Not shared with anyone." icon="phone-iphone" />
        <ListRow title="No tracking" subtitle="LifeOS doesn't track you." icon="verified-user" />
        <Divider />
        <ListRow
          title="Export full archive"
          subtitle={exporting === 'json' ? 'Preparing…' : 'JSON — everything you have saved'}
          icon="download"
          onPress={() => doExport('json')}
        />
        <ListRow
          title="Export activity log"
          subtitle={exporting === 'csv' ? 'Preparing…' : 'CSV — one row per logged day'}
          icon="table-chart"
          onPress={() => doExport('csv')}
        />
      </Group>

      {/* About */}
      <SectionHeader title="About" />
      <Group>
        <ListRow title="LifeOS principles" subtitle="How LifeOS works, and support guidance" icon="menu-book" onPress={() => router.push('/settings/principles')} />
        <ListRow title="Version" icon="info-outline" value={Constants.expoConfig?.version ?? '1.0.0'} />
        {DEV_TOOLS ? (
          <ListRow title="Design system" subtitle="Developer only — tokens and components" icon="palette" onPress={() => router.push('/dev')} />
        ) : null}
        {DEV_TOOLS ? (
          <ListRow
            title="Load sample data"
            subtitle="Developer only — replaces your data with an example"
            icon="science"
            onPress={() =>
              confirmAction('Load sample data', 'This replaces your current goals, habits and logs.', () => {
                loadSampleData();
                router.replace('/today');
              })
            }
          />
        ) : null}
      </Group>

      {/* Account */}
      <SectionHeader title="Account" />
      <Group>
        <ListRow title="Sign out" icon="logout" onPress={doSignOut} />
        <Divider />
        <ListRow
          title="Delete account and all data"
          subtitle="Permanent — can't be undone"
          icon="delete-outline"
          danger
          onPress={() => setDeleteOpen(true)}
        />
      </Group>

      <ProfileSheet
        visible={profileOpen}
        onClose={() => setProfileOpen(false)}
        name={user.name}
        email={user.email}
        onSave={async (name, email) => {
          const err = await updateUser({ name, email });
          if (!err) setProfileOpen(false);
          return err;
        }}
      />
      <AreasSheet
        visible={areasOpen}
        onClose={() => setAreasOpen(false)}
        value={user.focusAreas}
        onSave={async (focusAreas) => {
          await updateUser({ focusAreas });
          setAreasOpen(false);
        }}
      />
      <Sheet visible={quietEdit !== null} onClose={() => setQuietEdit(null)} title={quietEdit === 'start' ? 'Quiet hours start' : 'Quiet hours end'}>
        {quietEdit ? (
          <TimePicker
            value={quietEdit === 'start' ? settings.quietStart : settings.quietEnd}
            onChange={(v) => updateSettings(quietEdit === 'start' ? { quietStart: v } : { quietEnd: v })}
          />
        ) : null}
        <Button title="Done" onPress={() => setQuietEdit(null)} />
      </Sheet>
      <DeleteSheet
        visible={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={async () => {
          await cancelAllNotifications();
          await deleteAccount();
        }}
      />
      <View style={{ height: spacing.md, borderRadius: radius.lg }} />
    </Screen>
  );
}

function ProfileSheet({
  visible,
  onClose,
  name,
  email,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  name: string;
  email: string;
  onSave: (name: string, email: string) => Promise<string | null>;
}) {
  const [n, setN] = useState(name);
  const [e, setE] = useState(email);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (visible) {
      setN(name);
      setE(email);
      setError(null);
    }
  }, [visible, name, email]);
  const save = () => {
    if (!n.trim()) return setError('Enter your name.');
    const emailError = validateEmail(e);
    if (emailError) return setError(emailError);
    onSave(n.trim(), normalizeEmail(e)).then((err) => err && setError(err));
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="Edit profile">
      <Field label="Name">
        <TextField value={n} onChangeText={setN} accessibilityLabel="Name" />
      </Field>
      <Field label="Email">
        <TextField value={e} onChangeText={setE} autoCapitalize="none" keyboardType="email-address" accessibilityLabel="Email" error={error} />
      </Field>
      <Button title="Save" onPress={save} />
    </Sheet>
  );
}

function AreasSheet({
  visible,
  onClose,
  value,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  value: FocusArea[];
  onSave: (v: FocusArea[]) => void;
}) {
  const [v, setV] = useState<FocusArea[]>(value);
  useEffect(() => {
    if (visible) setV(value);
  }, [visible, value]);
  return (
    <Sheet visible={visible} onClose={onClose} title="Focus areas">
      <Text variant="bodyMd" tone="secondary">
        Used to suggest templates. Choose any that matter right now.
      </Text>
      <ChipGroup<FocusArea>
        multiple
        options={FOCUS_AREAS.map((a) => ({ value: a.value, label: a.label, icon: a.icon }))}
        value={v}
        onChange={(x) => setV(x as FocusArea[])}
      />
      <Button title="Save" onPress={() => onSave(v)} />
    </Sheet>
  );
}

function DeleteSheet({ visible, onClose, onConfirm }: { visible: boolean; onClose: () => void; onConfirm: () => Promise<void> }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (visible) setText('');
  }, [visible]);
  return (
    <Sheet visible={visible} onClose={onClose} title="Delete account">
      <Banner
        tone="error"
        icon="warning-amber"
        title="This can't be undone"
        body="Your account, goals, commitments, habits, logs and reflections will be permanently removed from this device."
      />
      <Field label='Type "DELETE" to confirm'>
        <TextField value={text} onChangeText={setText} autoCapitalize="characters" accessibilityLabel="Type DELETE to confirm" />
      </Field>
      <Button
        title="Delete everything"
        variant="danger"
        icon="delete-forever"
        disabled={text.trim() !== 'DELETE'}
        loading={busy}
        onPress={async () => {
          setBusy(true);
          await onConfirm();
          setBusy(false);
        }}
      />
      <Button title="Keep my account" variant="ghost" onPress={onClose} />
    </Sheet>
  );
}
