import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

const TechZones = () => {
    const [zones, setZones] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchZones = async () => {
            try {
                // Lấy danh sách zone mà KTV này được phân công
                const data = await api.zones.getAll();
                setZones(data);
            } catch (error) {
                console.error("Lỗi tải danh sách khu vực:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchZones();
    }, []);

    if (isLoading) {
        return <div className="flex h-64 items-center justify-center text-emerald-600 font-bold animate-pulse">Đang nạp danh sách khu vực...</div>;
    }

    return (
        <div className="animate-fade-in max-w-7xl mx-auto pb-10">
            {/* HEADER */}
            <div className="mb-8">
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">Khu Vực Phụ Trách</h2>
                <p className="text-slate-500 font-medium mt-1">Quản lý và theo dõi thông số chi tiết của từng nhà màng.</p>
            </div>

            {/* GRID CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {zones.length === 0 ? (
                    <div className="col-span-full bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-3xl text-slate-300 mb-4">
                            <i className="fas fa-seedling"></i>
                        </div>
                        <h3 className="text-lg font-bold text-slate-700">Chưa có khu vực nào</h3>
                        <p className="text-slate-500 mt-1">Bạn chưa được admin phân công quản lý khu vực nào.</p>
                    </div>
                ) : zones.map(zone => (
                    <div 
                        key={zone.zone_id} 
                        onClick={() => navigate(`/tech/zones/${zone.zone_id}`)}
                        className="group bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 hover:border-emerald-200 cursor-pointer transition-all duration-300 relative overflow-hidden"
                    >
                        {/* Hiệu ứng background nhẹ khi hover */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl -mr-10 -mt-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                        <div className="relative z-10 flex justify-between items-start mb-6">
                            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-inner">
                                <i className="fas fa-leaf"></i>
                            </div>
                            <span className="bg-slate-100 text-slate-500 text-xs font-mono font-bold px-3 py-1.5 rounded-lg border border-slate-200">
                                #{zone.zone_id}
                            </span>
                        </div>
                        
                        <div className="relative z-10">
                            <h3 className="text-xl font-black text-slate-800 mb-1 group-hover:text-emerald-700 transition-colors">{zone.name}</h3>
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                                    {zone.crop_type || 'Chưa phân loại'}
                                </span>
                            </div>
                            <p className="text-sm text-slate-500 line-clamp-2 h-10 mb-6">
                                {zone.description || 'Không có mô tả chi tiết cho khu vực này.'}
                            </p>
                        </div>
                        
                        <div className="relative z-10 pt-4 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-400 group-hover:text-emerald-600 transition-colors">
                                Xem báo cáo & thiết bị
                            </span>
                            <div className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                <i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TechZones;