#!/usr/bin/env node
// state/quota.json 을 읽어 재무 신호를 출력한다. 기준은 docs/design.md 4절.
// quota.json 은 get_usage 결과의 plan 객체 원본이다: { windows: [{ label, percentUsed, resetsAt }, ...] }
// 출력: {"signal": "...", "five_hour": n, "seven_day": n, "resets_at": "...", "weekly_low": bool}
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const quotaPath = path.join(root, 'state', 'quota.json');

const CAUTION_AT = 70;
const WRAP_UP_AT = 85;
const WEEKLY_LOW_AT = 85;

let quota;
try {
  quota = JSON.parse(readFileSync(quotaPath, 'utf8'));
} catch (err) {
  console.log(
    JSON.stringify({ signal: 'CAUTION', reason: `quota.json을 읽지 못함: ${err.message}` }),
  );
  process.exit(0);
}

const windows = Array.isArray(quota.windows) ? quota.windows : [];
const findWindow = (re) => windows.find((w) => re.test(w.label ?? ''));
const fiveWin = findWindow(/^5-hour/i);
const sevenWin = findWindow(/^Weekly · all models/i);
const five = fiveWin?.percentUsed;
const seven = sevenWin?.percentUsed;

if (typeof five !== 'number') {
  console.log(JSON.stringify({ signal: 'CAUTION', reason: '5시간 사용률 값이 없음' }));
  process.exit(0);
}

let signal = 'GO';
if (five >= WRAP_UP_AT) signal = 'WRAP_UP';
else if (five >= CAUTION_AT) signal = 'CAUTION';

const weeklyLow = typeof seven === 'number' && seven >= WEEKLY_LOW_AT;

console.log(
  JSON.stringify({
    signal,
    five_hour: five,
    seven_day: seven ?? null,
    resets_at: fiveWin?.resetsAt ?? null,
    weekly_low: weeklyLow,
  }),
);
