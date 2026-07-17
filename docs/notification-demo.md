# Notification demo checklist

Use this after deploying the current branch. The **Send a test push** button
exercises the real VAPID → Supabase → web-push → service-worker path; it
is not an in-page imitation.

## Desktop Safari

1. Open `https://matinee.nyc/notify` in Safari 16+ on macOS 13+.
2. Turn on **Deadline alerts** and choose **Allow** in Safari’s permission prompt.
3. Confirm the card says alerts are ready, then choose **Send a test push**.
4. Move Safari to the background. Confirm the macOS notification says
   **Matinee · Test successful** and opens `/notify` when clicked.

## Installed iPhone PWA

1. In Safari on iOS 16.4+, open `https://matinee.nyc/notify`, tap Share, then
   **Add to Home Screen**.
2. Launch Matinee from the new Home Screen icon. Do not test inside a normal
   Safari tab; Apple exposes web push only to installed web apps.
3. Turn on **Deadline alerts**, choose **Allow**, then tap **Send a test push**.
4. Put Matinee in the background. Confirm the notification arrives and opens
   the installed app back to `/notify`.

## Ten-second backup recording

On iPhone, start Screen Recording before step 3 above. Capture this single
continuous shot:

1. Tap **Send a test push**.
2. Swipe Home so Matinee is visibly in the background.
3. Hold on the arriving **Matinee · Test successful** notification long enough
   to read it.
4. Tap the notification and end on the Following screen.

Trim the clip to the tap, Home Screen, notification, and return. Keep the
permission prompt out of the recording so the result is easy to understand.

## Scheduler check

The `Notify cron` GitHub Action runs every 15 minutes. A healthy run prints a
JSON summary such as:

```json
{"events":3,"subscribers":1,"sent":1,"deduped":0,"pruned":0}
```

`subscribers: 0` is healthy when no device is currently opted in. `sent: 0` is
also normal when no followed-show event is due; use **Send a test push** for an
immediate delivery check.
