import React, { useState, useEffect } from 'react';

const FarmerWeather = () => {
    const [weatherData, setWeatherData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [locationStatus, setLocationStatus] = useState("Đang định vị nông trại...");
    
    // Tọa độ mặc định (TP.HCM) sẽ được dùng nếu user từ chối cấp quyền vị trí
    const [coords, setCoords] = useState({ lat: 10.8231, lon: 106.6297 });

    // 1. HÀM TỰ ĐỘNG LẤY VỊ TRÍ (GEOLOCATION)
    useEffect(() => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setCoords({
                        lat: position.coords.latitude,
                        lon: position.coords.longitude
                    });
                    setLocationStatus("Đã lấy được vị trí hiện tại!");
                },
                (error) => {
                    console.warn("Lỗi lấy vị trí (hoặc bị từ chối):", error.message);
                    setLocationStatus("Đang dùng vị trí mặc định (TP.HCM).");
                },
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
        } else {
            setLocationStatus("Trình duyệt không hỗ trợ định vị.");
        }
    }, []);

    // 2. HÀM GỌI API THỜI TIẾT DỰA TRÊN TỌA ĐỘ VỪA LẤY
    useEffect(() => {
        const fetchWeather = async () => {
            try {
                setIsLoading(true);
                // Gọi API Open-Meteo với tọa độ động
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FBangkok`;
                
                const response = await fetch(url);
                const data = await response.json();
                setWeatherData(data);
            } catch (error) {
                console.error("Lỗi lấy dữ liệu thời tiết:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchWeather();
    }, [coords]); // Chạy lại hàm này mỗi khi coords thay đổi

    // Hàm chuyển đổi mã Thời tiết (WMO Code) sang Icon
    const getWeatherInfo = (code, isDay = 1) => {
        const wmoCodes = {
            0: { text: 'Trời quang / Nắng đẹp', icon: isDay ? 'fas fa-sun text-yellow-400' : 'fas fa-moon text-slate-200' },
            1: { text: 'Chủ yếu quang đãng', icon: isDay ? 'fas fa-cloud-sun text-yellow-300' : 'fas fa-cloud-moon text-slate-300' },
            2: { text: 'Có mây rải rác', icon: 'fas fa-cloud text-slate-400' },
            3: { text: 'Trời nhiều mây', icon: 'fas fa-cloud text-slate-500' },
            45: { text: 'Có sương mù', icon: 'fas fa-smog text-slate-400' },
            48: { text: 'Sương mù dày đặc', icon: 'fas fa-smog text-slate-500' },
            51: { text: 'Mưa phùn nhẹ', icon: 'fas fa-cloud-rain text-blue-400' },
            53: { text: 'Mưa phùn vừa', icon: 'fas fa-cloud-rain text-blue-500' },
            55: { text: 'Mưa phùn dày', icon: 'fas fa-cloud-rain text-blue-600' },
            61: { text: 'Mưa rào nhẹ', icon: 'fas fa-cloud-showers-heavy text-blue-400' },
            63: { text: 'Mưa rào vừa', icon: 'fas fa-cloud-showers-heavy text-blue-500' },
            65: { text: 'Mưa rào to', icon: 'fas fa-cloud-showers-heavy text-blue-600' },
            80: { text: 'Mưa rào rải rác', icon: 'fas fa-cloud-showers-heavy text-blue-500' },
            95: { text: 'Giông bão', icon: 'fas fa-bolt text-amber-500' },
            99: { text: 'Bão lớn kèm mưa', icon: 'fas fa-poo-storm text-amber-600' },
        };
        return wmoCodes[code] || { text: 'Không xác định', icon: 'fas fa-cloud text-slate-400' };
    };

    if (isLoading || !weatherData) {
        return (
            <div className="flex flex-col h-screen items-center justify-center text-blue-500 font-bold animate-pulse">
                <i className="fas fa-location-crosshairs text-5xl mb-4 animate-spin-slow"></i>
                {locationStatus}
            </div>
        );
    }

    const current = weatherData.current;
    const daily = weatherData.daily;
    const currentWeather = getWeatherInfo(current.weather_code, current.is_day);

    let farmingAdvice = "";
    if (current.weather_code >= 51 && current.weather_code <= 99) {
        farmingAdvice = "Trời đang có mưa. Hệ thống AI sẽ tự động tạm ngưng tưới nước để tránh ngập úng.";
    } else if (current.temperature_2m > 35) {
        farmingAdvice = "Trời rất nóng! AI đã kích hoạt chế độ phun sương làm mát định kỳ.";
    } else {
        farmingAdvice = "Thời tiết lý tưởng. Hệ thống tưới tiêu hoạt động theo lịch trình bình thường.";
    }

    return (
        <div className="animate-fade-in max-w-7xl mx-auto pb-10 space-y-6">
            
            {/* 1. HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">Thời tiết Nông trại</h2>
                    <p className="text-slate-500 font-medium mt-1">
                        <i className="fas fa-map-marker-alt text-rose-500 mr-2"></i>
                        {locationStatus}
                    </p>
                </div>
                {/* Nút ép định vị lại */}
                <button 
                    onClick={() => window.location.reload()} 
                    className="bg-white border border-slate-200 text-slate-600 hover:text-blue-600 px-4 py-2 rounded-xl font-bold transition-colors shadow-sm"
                >
                    <i className="fas fa-sync-alt mr-2"></i> Làm mới Vị trí
                </button>
            </div>

            {/* 2. CHIA BỐ CỤC: TRÁI (THỜI TIẾT) - PHẢI (BẢN ĐỒ) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Khu vực Trái: Thẻ Thời tiết (Chiếm 2 phần) */}
                <div className={`lg:col-span-2 relative overflow-hidden rounded-[2rem] shadow-lg p-8 ${current.is_day ? 'bg-gradient-to-br from-sky-400 to-blue-600 text-white' : 'bg-gradient-to-br from-slate-800 to-indigo-950 text-slate-100'}`}>
                    <i className={`${currentWeather.icon.split(' ')[0]} absolute -right-10 -top-10 text-[200px] opacity-10 drop-shadow-2xl`}></i>
                    
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-6 w-full md:w-auto">
                            <div className="w-28 h-28 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center shadow-inner border border-white/30 shrink-0">
                                <i className={`${currentWeather.icon.replace(/text-\w+-\d+/, '')} text-5xl text-white drop-shadow-md`}></i>
                            </div>
                            <div>
                                <div className="text-6xl font-black tracking-tighter drop-shadow-md">
                                    {current.temperature_2m}<span className="text-3xl">°C</span>
                                </div>
                                <div className="text-lg font-bold mt-2 bg-white/20 inline-block px-4 py-1 rounded-full backdrop-blur-sm">
                                    {currentWeather.text}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
                            <div className="bg-black/10 backdrop-blur-sm p-3 rounded-2xl border border-white/10">
                                <div className="text-xs font-bold uppercase tracking-wider mb-1 opacity-80"><i className="fas fa-temperature-half mr-1"></i>Cảm giác</div>
                                <div className="text-xl font-black">{current.apparent_temperature}°C</div>
                            </div>
                            <div className="bg-black/10 backdrop-blur-sm p-3 rounded-2xl border border-white/10">
                                <div className="text-xs font-bold uppercase tracking-wider mb-1 opacity-80"><i className="fas fa-droplet mr-1"></i>Độ ẩm</div>
                                <div className="text-xl font-black">{current.relative_humidity_2m}%</div>
                            </div>
                            <div className="bg-black/10 backdrop-blur-sm p-3 rounded-2xl border border-white/10">
                                <div className="text-xs font-bold uppercase tracking-wider mb-1 opacity-80"><i className="fas fa-wind mr-1"></i>Gió</div>
                                <div className="text-xl font-black">{current.wind_speed_10m} km/h</div>
                            </div>
                            <div className="bg-black/10 backdrop-blur-sm p-3 rounded-2xl border border-white/10">
                                <div className="text-xs font-bold uppercase tracking-wider mb-1 opacity-80"><i className="fas fa-cloud-showers-water mr-1"></i>Mưa</div>
                                <div className="text-xl font-black">{current.precipitation} mm</div>
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 mt-6 bg-white/20 backdrop-blur-md p-4 rounded-xl border border-white/30 flex items-start gap-3">
                        <i className="fas fa-robot text-2xl mt-0.5"></i>
                        <div>
                            <h4 className="font-bold text-sm uppercase tracking-wider mb-1 opacity-90">Phân tích từ AI</h4>
                            <p className="font-medium">{farmingAdvice}</p>
                        </div>
                    </div>
                </div>

                {/* Khu vực Phải: Bản đồ Google Maps (Chiếm 1 phần) */}
                <div className="lg:col-span-1 bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col relative group">
                    <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-white absolute top-0 w-full z-10 opacity-90 group-hover:opacity-100 transition-opacity">
                        <h3 className="font-bold text-slate-800"><i className="fas fa-satellite text-blue-500 mr-2"></i>Bản đồ Vệ tinh</h3>
                    </div>
                    {/* iframe nhúng Google Maps không cần API Key */}
                    <iframe
                        title="Farm Location"
                        width="100%"
                        height="100%"
                        className="min-h-[300px] flex-1 border-0"
                        loading="lazy"
                        allowFullScreen
                        referrerPolicy="no-referrer-when-downgrade"
                        src={`https://maps.google.com/maps?q=${coords.lat},${coords.lon}&t=k&z=17&ie=UTF8&iwloc=&output=embed`}
                    ></iframe>
                </div>
            </div>

            {/* 3. DỰ BÁO 7 NGÀY TỚI */}
            <div className="pt-4">
                <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
                    <i className="fas fa-calendar-alt text-blue-500 mr-2"></i> Dự báo 7 ngày tới
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    {daily.time.map((timeStr, index) => {
                        if (index === 0) return null; // Bỏ qua hôm nay
                        const date = new Date(timeStr);
                        const dailyWeather = getWeatherInfo(daily.weather_code[index]);
                        
                        return (
                            <div key={index} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center hover:-translate-y-1 transition-transform">
                                <span className="text-sm font-bold text-slate-500 uppercase">{date.toLocaleDateString('vi-VN', { weekday: 'short' })}</span>
                                <span className="text-xs text-slate-400 mb-3">{date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</span>
                                
                                <i className={`${dailyWeather.icon} text-3xl mb-3`}></i>
                                
                                <div className="text-sm font-black text-slate-800">
                                    {Math.round(daily.temperature_2m_max[index])}° <span className="text-slate-400 font-medium text-xs">/ {Math.round(daily.temperature_2m_min[index])}°</span>
                                </div>
                                
                                {daily.precipitation_probability_max[index] > 20 && (
                                    <div className="mt-2 text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-md">
                                        <i className="fas fa-tint mr-1"></i> Mưa {daily.precipitation_probability_max[index]}%
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

        </div>
    );
};

export default FarmerWeather;