// api/cal.js
// Usage: other-booking.vercel.app/api/cal?row=6
// Fetches your published Google Sheet CSV, finds the row by number,
// rebuilds the same Google Calendar TEMPLATE URL your sheet formula
// already builds, and 302-redirects straight to it.

module.exports = async function handler(req, res) {
  const { row } = req.query;

  if (!row) {
    res.status(400).send('Missing row parameter');
    return;
  }

  try {
    // Replace with your actual published CSV URL
    const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS8bXLOsU9gUZSiqnlKI3KG2-3_17BTprjJ4_zQ5IgxgGHMT2YBzq8FxwPCuDEzgEcDCkEHoI5B_M7b/pub?gid=0&single=true&output=csv';

    const response = await fetch(CSV_URL);
    const csvText = await response.text();

    const lines = csvText.split('\n').map(l => l.split(','));
    const header = lines[0];

    // row param is the sheet row number (e.g. 6), data rows start at index 1
    // so sheet row 6 = lines[5] if row 1 is header
    const targetRow = lines[Number(row) - 1];

    if (!targetRow) {
      res.status(404).send('Booking not found');
      return;
    }

    // Adjust these column indices to match your actual sheet layout
    // Example assumes: A=date, B=time, F=service, G=details
    const dateCol = targetRow[0];   // A
    const timeCol = targetRow[1];   // B
    const serviceCol = targetRow[5]; // F
    const detailsCol = targetRow[6]; // G

    const dateParts = dateCol.split('-'); // DD-MM-YYYY
    const yyyy = dateParts[2];
    const mm = dateParts[1];
    const dd = dateParts[0];
    const timeClean = timeCol.replace('.', '') + '00';

    const dates = `${yyyy}${mm}${dd}T${timeClean}/${yyyy}${mm}${dd}T${timeClean}`;
    const text = encodeURIComponent(`★ ${serviceCol} ${detailsCol} ★ at OTHER___0.01`);
    const details = encodeURIComponent(detailsCol);
    const location = encodeURIComponent('https://other-location.vercel.app/');

    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}&location=${location}&ctz=Asia/Bangkok`;

    res.writeHead(302, { Location: calendarUrl });
    res.end();
  } catch (err) {
    res.status(500).send('Error building calendar link: ' + err.message);
  }
}
