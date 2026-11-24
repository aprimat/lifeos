import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { todayISO } from '@/domain/dates';
import { versionOn } from '@/domain/schedule';
import type { User, UserData } from '@/domain/types';

/** Export personal data as JSON (everything) or CSV (activity log). */

function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(data: UserData): string {
  const habits = new Map(data.habits.map((h) => [h.id, h]));
  const header = ['date', 'habit', 'kind', 'status', 'value', 'unit', 'rescheduled_to', 'note'];
  const rows = [...data.logs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((l) => {
      const h = habits.get(l.habitId);
      const v = h ? versionOn(h, l.date) : null;
      return [l.date, h?.title ?? '', h?.kind ?? '', l.status, l.value, v?.build?.unit ?? v?.reduce?.unit ?? '', l.rescheduledTo, l.note]
        .map(csvEscape)
        .join(',');
    });
  return [header.join(','), ...rows].join('\n');
}

export function toJson(user: User, data: UserData): string {
  const { passwordHash: _h, salt: _s, ...profile } = user;
  return JSON.stringify({ exportedAt: new Date().toISOString(), app: 'LifeOS', profile, data }, null, 2);
}

export async function shareExport(kind: 'json' | 'csv', user: User, data: UserData): Promise<void> {
  const content = kind === 'json' ? toJson(user, data) : toCsv(data);
  const name = `lifeos-${kind === 'json' ? 'archive' : 'activity'}-${todayISO()}.${kind}`;
  const mime = kind === 'json' ? 'application/json' : 'text/csv';

  if (Platform.OS === 'web') {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: mime, dialogTitle: 'Export LifeOS data' });
  }
}
