import fetch from 'node-fetch';
import { parse } from 'node-html-parser';

export default async (req, res) => {
  // تنظیم هدرهای CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // برای درخواست‌های OPTIONS پاسخ دهید
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const sources = [
      {
        url: 'https://irsc.ut.ac.ir/events_list_fa.html',
        type: 'html'
      },
      {
        url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
        type: 'json'
      }
    ];

    // ... (بقیه کد مانند قبل)
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
