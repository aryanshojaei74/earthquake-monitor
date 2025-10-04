import fetch from 'node-fetch';
import { parse } from 'node-html-parser';
import { toJalaali } from 'jalaali-js';

export default async (req, res) => {
  try {
    const response = await fetch('http://irsc.ut.ac.ir/index.php?lang=fa', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EarthquakeBot/1.0)' }
    });

    const html = await response.text();
    const root = parse(html);
    const table = root.querySelector('table.table');

    if (!table) throw new Error('Table not found');

    const earthquakes = [];
    const rows = table.querySelectorAll('tr').slice(1);

    for (const row of rows) {
      const cols = row.querySelectorAll('td');
      if (cols.length >= 7) {
        const [date, time] = cols[0].text.trim().split(' ');
        const [year, month, day] = date.split('-').map(Number);

        const { jy, jm, jd } = toJalaali(year, month, day);
        const jalaliDate = `${jy}/${jm}/${jd}`;

        earthquakes.push({
          date: jalaliDate,
          time: time || '00:00:00',
          latitude: parseFloat(cols[2].text.trim()),
          longitude: parseFloat(cols[3].text.trim()),
          depth: parseFloat(cols[4].text.trim()),
          magnitude: parseFloat(cols[5].text.trim()),
          location: cols[6].text.trim()
        });
      }
    }

    res.status(200).json({
      data: earthquakes,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
