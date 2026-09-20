// /api/ics.js
// Deploy this alongside index.html in the same Vercel project (pinpanee/Other-booking),
// in an /api folder at the repo root. Vercel auto-detects it as a serverless function
// reachable at https://other-booking.vercel.app/api/ics
//
// Returns a real .ics file (Content-Type: text/calendar) instead of redirecting to
// calendar.google.com. This is what lets "Add to Calendar" work when the link is opened
// inside Instagram's in-app browser or inside an email client — both of which either
// block Google's calendar page or strip data: URIs, but both hand off a normal
// text/calendar https response to the device's calendar app without issue.
//
// Expected query params (all come from buildIcsLinkUrl() in index.html):
//   ref      - booking reference, without the leading '#' (e.g. "1130-200926")
//   date     - appointment date, ISO format YYYY-MM-DD
//   time     - appointment time, 24hr HH:MM
//   services - human-readable service list (e.g. "HAIR Cut · NAILS Mani")
//   location - optional, defaults to the studio's physical address (below)

const STUDIO_ADDRESS =
  'PHW3+XW8 Tower Park Condo Soi Sukhumvit 3, Khwaeng Khlong Toei Nuea, Watthana, Bangkok 10110';

export default function handler(req, res) {
  const {
    ref = '',
    date = '',
    time = '',
    services = 'Appointment',
    location = STUDIO_ADDRESS,
  } = req.query;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    res.status(400).send('Missing or invalid date/time. Expected date=YYYY-MM-DD&time=HH:MM');
    return;
  }

  const dtLocal = date.replace(/-/g, '') + 'T' + time.replace(':', '') + '00';

  // Escape per RFC 5545: backslash, semicolon, comma, then newlines
  const esc = (s) =>
    String(s)
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');

  const summary = esc(`★ ${services} ★ at OTHER___0.01`);
  const descLines = [services];
  if (ref) descLines.push(`Booking ref: #${ref}`);
  descLines.push('Directions: https://other-location.vercel.app/');
  const description = esc(descLines.join('\n\n'));
  const loc = esc(location);
  const uid = `${ref || Date.now()}@other-booking.vercel.app`;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  // DTSTART/DTEND intentionally identical, matching the studio's existing
  // Google Calendar link behavior. Some calendar apps will render this as a
  // zero-length marker; others (like Google's own web client) default it to
  // a standard duration. If you'd rather the event span the real service
  // duration, pass a `duration` (minutes) query param and compute DTEND here.
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//OTHER___0.01//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=Asia/Bangkok:${dtLocal}`,
    `DTEND;TZID=Asia/Bangkok:${dtLocal}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${loc}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="OTHER-appointment.ics"');
  res.status(200).send(ics);
}
