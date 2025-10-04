import { NextResponse } from 'next/server'

// تابع برای تبدیل تاریخ میلادی به شمسی
function toJalali(date) {
  const gregorian = new Date(date)
  const options = { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    calendar: 'persian',
    numberingSystem: 'latn'
  }
  return new Intl.DateTimeFormat('fa-IR', options).format(gregorian)
}

// محدوده جغرافیایی ایران
const IRAN_BOUNDS = {
  minLat: 25,
  maxLat: 40,
  minLon: 44,
  maxLon: 64
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const days = searchParams.get('days') || '7'
    const minMagnitude = searchParams.get('minMagnitude') || '2.5'

    // استفاده از USGS Earthquake API
    const endTime = new Date().toISOString()
    const startTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${startTime}&endtime=${endTime}&minmagnitude=${minMagnitude}&minlatitude=${IRAN_BOUNDS.minLat}&maxlatitude=${IRAN_BOUNDS.maxLat}&minlongitude=${IRAN_BOUNDS.minLon}&maxlongitude=${IRAN_BOUNDS.maxLon}`

    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error('خطا در دریافت داده از USGS')
    }

    const data = await response.json()

    // تبدیل داده‌ها به فرمت مورد نیاز
    const earthquakes = data.features.map(feature => {
      const props = feature.properties
      const coords = feature.geometry.coordinates
      const datetime = new Date(props.time)
      const jalaliDateTime = toJalali(datetime)
      const [datePart, timePart] = jalaliDateTime.split('،')

      return {
        id: feature.id,
        magnitude: props.mag || 0,
        depth: Math.abs(coords[2]) || 0, // عمق به کیلومتر
        region: props.place || 'نامشخص',
        latitude: parseFloat(coords[1].toFixed(4)),
        longitude: parseFloat(coords[0].toFixed(4)),
        date: datePart?.trim() || '',
        time: timePart?.trim() || '',
        timestamp: props.time,
        url: props.url,
        type: props.type,
        status: props.status
      }
    })

    // مرتب‌سازی بر اساس زمان (جدیدترین اول)
    earthquakes.sort((a, b) => b.timestamp - a.timestamp)

    return NextResponse.json({
      success: true,
      count: earthquakes.length,
      data: earthquakes,
      lastUpdate: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error fetching earthquakes:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'خطا در دریافت داده‌های زلزله',
        message: error.message 
      },
      { status: 500 }
    )
  }
}
