import fetch from 'node-fetch';
import { parse } from 'node-html-parser';

// فعال‌سازی حالت توسعه برای نمایش خطاهای دقیق
process.env.NODE_ENV = 'development';

export default async (req, res) => {
  console.log('دریافت درخواست جدید - زمان:', new Date().toISOString());
  
  try {
    // تنظیم هدرهای ضروری
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // لیست منابع با اولویت‌بندی
    const sources = [
      {
        url: 'http://irsc.ut.ac.ir/events_list_fa.html',
        type: 'html',
        parser: (content) => {
          const root = parse(content);
          return root.querySelectorAll('tr').slice(1).map(row => {
            const cols = row.querySelectorAll('td');
            return {
              date: cols[0]?.text.trim(),
              time: cols[1]?.text.trim(),
              latitude: cols[2]?.text.trim(),
              longitude: cols[3]?.text.trim(),
              magnitude: cols[4]?.text.trim(),
              depth: cols[5]?.text.trim(),
              location: cols[6]?.text.trim(),
              source: 'IRSC'
            };
          }).filter(item => item.magnitude);
        }
      },
      {
        url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
        type: 'json',
        parser: (content) => {
          const data = JSON.parse(content);
          return data.features.map(item => ({
            date: new Date(item.properties.time).toLocaleString('fa-IR'),
            time: new Date(item.properties.time).toLocaleTimeString('fa-IR'),
            latitude: item.geometry.coordinates[1],
            longitude: item.geometry.coordinates[0],
            magnitude: item.properties.mag,
            depth: item.geometry.coordinates[2],
            location: item.properties.place,
            source: 'USGS'
          }));
        }
      }
    ];

    let lastError = null;
    
    for (const source of sources) {
      try {
        console.log(`تلاش برای دریافت داده از: ${source.url}`);
        
        const response = await fetch(source.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': source.type === 'json' ? 'application/json' : 'text/html',
            'Accept-Language': 'fa-IR,fa;q=0.9'
          },
          timeout: 15000
        });

        if (!response.ok) {
          throw new Error(`پاسخ HTTP: ${response.status}`);
        }

        const content = await response.text();
        const earthquakes = source.parser(content);

        if (earthquakes.length > 0) {
          console.log(`موفقیت! دریافت ${earthquakes.length} زمین‌لرزه از ${source.url}`);
          return res.status(200).json({
            success: true,
            data: earthquakes,
            source: source.url,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        lastError = error;
        console.error(`خطا در دریافت از ${source.url}:`, error.message);
        continue;
      }
    }

    throw lastError || new Error('هیچ یک از منابع پاسخگو نبودند');

  } catch (error) {
    console.error('خطای نهایی:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }
};
