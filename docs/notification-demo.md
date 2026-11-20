# Notification demo checklist

Use this after deploying the current branch. The **Send a test push** button
exercises the real VAPID → Supabase → web-push → service-worker path; it
is not an in-page imitation. It sends the next real alert for a show you
follow, prefixed "Test:", so follow one first (Chicago works: its 10 AM rush
alert reads **Chicago rush opens at 10:00 AM**).

## Desktop Safari

1. Open `https://matinee.nyc/notify` in Safari 16+ on macOS 13+.
2. Open a show (say `/shows/chicago`), tap **Follow** and choose **Allow**
   in Safari’s permission prompt.
3. On `/notify`, confirm the card says alerts are on, then choose **Send a
   test push**. The line under the button says whether this device displayed it.
4. Move Safari to the background. Confirm the macOS notification starts
   **Test:** and opens the show's ways to save when clicked.

## Installed iPhone PWA

1. In Safari on iOS 16.4+, open `https://matinee.nyc/notify`, tap Share, then
   **Add to Home Screen**.
2. Launch Matinee from the new Home Screen icon. Do not test inside a normal
   Safari tab; Apple exposes web push only to installed web apps.
3. Follow a show, choose **Allow**, then on `/notify` tap **Send a test push**.
4. Put Matinee in the background. Confirm the notification arrives and opens
   the installed app on that show's ways to save.

## Ten-second backup recording

On iPhone, start Screen Recording before step 3 above. Capture this single
continuous shot:

1. Tap **Send a test push**.
2. Swipe Home so Matinee is visibly in the background.
3. Hold on the arriving **Test: …** notification long enough to read it.
4. Tap the notification and end on the show's ways to save.

Trim the clip to the tap, Home Screen, notification, and return. Keep the
permission prompt out of the recording so the result is easy to understand.

## Scheduler check

Supabase Cron calls `/api/notify/run` every minute (the GitHub `Notify cron`
workflow is a backup every 15). Check it two ways:

```bash
curl -s https://matinee.nyc/api/health | jq '{ok, services, push}'
```

`services.scheduler` is `ok` when a run has succeeded in the last 20 minutes;
`push.lastRunSource` says which scheduler made the last run and
`push.lastSentAt` when the last push went out. In the Supabase SQL editor:

```sql
select id, status_code, left(content::text, 160) as body, created
  from net._http_response order by created desc limit 5;
```

A healthy run returns 200 with a summary such as
`{"events":3,"subscriptions":1,"pairs":1,"deduped":0,"sent":1,...}`.
`subscriptions: 0` and `sent: 0` are normal when nobody following a due
show is opted in; use **Send a test push** for an immediate delivery check.
