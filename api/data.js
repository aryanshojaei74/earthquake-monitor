import fetch from 'node-fetch';
import { parse } from 'node-html-parser';

export default async (req, res) => {
  try {
    // غیرفعال کردن کش
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    
    // تنظیم User-Agent شبیه مرورگر
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'fa-IR,fa;q=0.9'
      },
      timeout: 10000 // 10 ثانیه تایم‌اوت
    };

    const response = await fetch('http://irsc.ut.ac.ir/index.php?lang=fa', options);
    
    if (!response.ok) {
      throw new Error(`پاسخ غیرموفق: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    
    if (!html.includes('جدول اطلاعات زمین لرزه')) {
      throw new Error('ساختار صفحه تغییر کرده است');
    }

    const root = parse(html);
    const earthquakes = [];
    const rows = root.querySelectorAll('tr').slice(1);

    rows.forEach(row => {
      const cols = row.querySelectorAll('td');
      if (cols.length >= 7) {
        try {
          const [date, time] = cols[0].text.trim().split(/\s+/);
          const [year, month, day] = date.split('-').map(Number);
          
          earthquakes.push({
            date: `${year + 621}/${month}/${day}`,
            time: time || '00:00:00',
            latitude: parseFloat(cols[2].text.trim()),
            longitude: parseFloat(cols[3].text.trim()),
            depth: parseFloat(cols[4].text.trim()),
            magnitude: parseFloat(cols[5].text.trim()),
            location: cols[6].text.trim(),
            source: 'IRSC',
            fetchedAt: new Date().toISOString()
          });
        } catch (e) {
          console.warn('خطا در پردازش ردیف:', row.text);
        }
      }
    });

    if (earthquakes.length === 0) {
      throw new Error('هیچ داده زلزله‌ای یافت نشد');
    }

    res.status(200).json({
      success: true,
      data: earthquakes,
      lastUpdated: new Date().toISOString(),
      source: 'http://irsc.ut.ac.ir'
    });

  } catch (error) {
    console.error('خطای سرور:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
