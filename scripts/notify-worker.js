#!/usr/bin/env node
const cron = require('node-cron');
const fetch = globalThis.fetch || require('node-fetch');

const BASE = process.env.BASE_URL || 'http://localhost:3000';

async function listReminders() {
  const res = await fetch(`${BASE}/api/reminders`);
  const data = await res.json();
  return data.reminders || [];
}

async function sendNotification(payload) {
  await fetch(`${BASE}/api/notifications/send`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

function scheduleReminder(reminder) {
  const id = reminder.id;
  const schedule = reminder.schedule || '';
  if (schedule.startsWith('cron:')) {
    const spec = schedule.replace(/^cron:\s*/i, '');
    cron.schedule(spec, async () => {
      console.log('[worker] cron trigger', id, spec);
      await sendNotification({ userId: reminder.user_id, subject: `Reminder: ${reminder.kind}`, text: JSON.stringify(reminder.payload || {}) });
    });
    console.log('[worker] scheduled cron', id, spec);
    return;
  }

  if (schedule === 'daily') {
    // 09:00 daily
    cron.schedule('0 9 * * *', async () => {
      console.log('[worker] daily trigger', id);
      await sendNotification({ userId: reminder.user_id, subject: `Daily: ${reminder.kind}`, text: JSON.stringify(reminder.payload || {}) });
    });
    console.log('[worker] scheduled daily', id);
    return;
  }

  if (schedule === 'weekly') {
    // Monday 09:00
    cron.schedule('0 9 * * 1', async () => {
      console.log('[worker] weekly trigger', id);
      await sendNotification({ userId: reminder.user_id, subject: `Weekly: ${reminder.kind}`, text: JSON.stringify(reminder.payload || {}) });
    });
    console.log('[worker] scheduled weekly', id);
    return;
  }

  // ISO date: run once at that time
  const maybeDate = new Date(schedule);
  if (!isNaN(maybeDate.getTime())) {
    const now = Date.now();
    const when = maybeDate.getTime();
    const delay = when - now;
    if (delay > 0) {
      setTimeout(async () => {
        console.log('[worker] iso trigger', id);
        await sendNotification({ userId: reminder.user_id, subject: `Reminder: ${reminder.kind}`, text: JSON.stringify(reminder.payload || {}) });
      }, delay);
      console.log('[worker] scheduled iso', id, when);
    }
  }
}

async function main() {
  const once = process.argv.includes('--once');
  const reminders = await listReminders();
  for (const r of reminders) {
    try {
      scheduleReminder(r);
    } catch (e) {
      console.error('[worker] schedule failed', e);
    }
  }

  if (once) {
    console.log('Ran once and exiting');
    process.exit(0);
  }

  console.log('Worker running; press Ctrl+C to exit');
}

main().catch((e)=>{console.error(e); process.exit(1);});
