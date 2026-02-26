import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { toast } from 'react-toastify';

const TechDeviceManagement = () => {
    // --- STATE QUẢN LÝ DỮ LIỆU ---
    const [devices, setDevices] = useState([]);
    const [zones, setZones] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // --- STATE QUẢN LÝ MODAL (POPUP) ---
    const [modal, setModal] = useState({ isOpen: false, type: null, device: null });
    const [formData, setFormData] = useState({
        device_id: '',
        name: '',
        zone_id: '',
        temp_offset: 0,   // Dùng cho hiệu chuẩn
        humid_offset: 0   // Dùng cho hiệu chuẩn
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- FETCH DỮ LIỆU ---
    const fetchData = async () => {
        setIsLoading(true);
        try {
            // Lấy song song cả Thiết bị và Khu vực để ghép tên
            const [devicesData, zonesData] = await Promise.all([
                api.devices.getAll(),
                api.zones.getAll()
            ]);
            setDevices(devicesData);
            setZones(zonesData);
        } catch (error) {
            console.error("Lỗi lấy dữ liệu:", error);
            toast.error("Không thể tải danh sách thiết bị!");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- XỬ LÝ MỞ/ĐÓNG MODAL ---
    const openModal = (type, device = null) => {
        setModal({ isOpen: true, type, device });
        if (type === 'ADD') {
            setFormData({ device_id: '', name: '', zone_id: '', temp_offset: 0, humid_offset: 0 });
        } else if (device) {
            setFormData({
                device_id: device.device_id,
                name: device.name,
                zone_id: device.zone_id || '',
                temp_offset: device.temp_offset || 0,
                humid_offset: device.humid_offset || 0
            });
        }
    };

    const closeModal = () => {
        setModal({ isOpen: false, type: null, device: null });
        setFormData({ device_id: '', name: '', zone_id: '', temp_offset: 0, humid_offset: 0 });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // --- SUBMIT FORM TÙY THEO NGHIỆP VỤ ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Chuẩn hóa zone_id (nếu chọn 'Chưa gán' thì gửi null lên backend)
        const payload = {
            ...formData,
            zone_id: formData.zone_id === '' ? null : parseInt(formData.zone_id)
        };

        try {
            if (modal.type === 'ADD') {
                await api.devices.create(payload);
                toast.success("Đã khai báo mạch mới thành công!");
                
            } else if (modal.type === 'REPLACE') {
                // Đổi MAC: Gọi API update vào ID cũ, truyền payload chứa ID mới
                await api.devices.update(modal.device.device_id, payload);
                toast.success("Đã thay thế bo mạch và giữ nguyên lịch sử!");
                
            } else if (modal.type === 'CALIBRATE') {
                // Hiệu chuẩn: Cập nhật hệ số bù trừ (Cần DB có cột temp_offset/humid_offset)
                await api.devices.update(modal.device.device_id, {
                    temp_offset: parseFloat(formData.temp_offset),
                    humid_offset: parseFloat(formData.humid_offset)
                });
                toast.success("Đã lưu cấu hình hiệu chuẩn cảm biến!");
            }
            
            closeModal();
            fetchData(); // Load lại bảng sau khi thành công
        } catch (error) {
            console.error("Submit Error:", error);
            toast.error(error.message || "Có lỗi xảy ra, vui lòng thử lại!");
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- RENDER GIAO DIỆN ---
    if (isLoading) return <div className="p-10 text-center text-slate-400 font-bold animate-pulse">Đang tải dữ liệu kho thiết bị...</div>;

    return (
        <div className="animate-fade-in max-w-7xl mx-auto pb-10">
            {/* --- HEADER --- */}
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">Kho Thiết Bị (Hardware)</h2>
                    <p className="text-slate-500 font-medium mt-1">Quản lý địa chỉ MAC, thay thế phần cứng và hiệu chuẩn cảm biến.</p>
                </div>
                <button 
                    onClick={() => openModal('ADD')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold transition-colors shadow-lg shadow-emerald-200 flex items-center"
                >
                    <i className="fas fa-plus mr-2"></i> Khai báo Mạch mới
                </button>
            </div>

            {/* --- BẢNG THIẾT BỊ --- */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden relative">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Tên Thiết Bị / Khu vực</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Mã MAC (Device ID)</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Tín hiệu</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Thao tác Kỹ thuật</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {devices.length === 0 ? (
                                <tr><td colSpan="4" className="text-center py-10 text-slate-400">Kho trống. Chưa có thiết bị nào.</td></tr>
                            ) : devices.map(dev => {
                                // Tìm tên Zone
                                const zoneName = zones.find(z => z.zone_id === dev.zone_id)?.name || 'Trong kho (Chưa gán)';
                                
                                return (
                                    <tr key={dev.device_id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800">{dev.name}</div>
                                            <div className="text-xs text-emerald-600 font-bold mt-1 uppercase">
                                                <i className="fas fa-map-marker-alt mr-1 opacity-70"></i> {zoneName}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-mono text-sm bg-slate-100 px-2 py-1 rounded-md border border-slate-200 inline-block text-slate-600 font-bold shadow-inner">
                                                {dev.device_id}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {dev.status === 'ONLINE' ? (
                                                <span className="w-3 h-3 bg-emerald-500 rounded-full inline-block shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                                            ) : (
                                                <span className="w-3 h-3 bg-rose-500 rounded-full inline-block animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.5)]"></span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    onClick={() => openModal('REPLACE', dev)}
                                                    className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-100" 
                                                    title="Thay bo mạch mới (Giữ nguyên lịch sử)"
                                                >
                                                    <i className="fas fa-exchange-alt"></i>
                                                </button>
                                                <button 
                                                    onClick={() => openModal('CALIBRATE', dev)}
                                                    className="p-2.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all border border-transparent hover:border-amber-100" 
                                                    title="Hiệu chuẩn sai số cảm biến"
                                                >
                                                    <i className="fas fa-sliders-h"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- VÙNG HIỂN THỊ MODAL (POPUP) --- */}
            {modal.isOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100">
                        {/* Modal Header */}
                        <div className={`px-6 py-4 border-b ${modal.type === 'REPLACE' ? 'bg-blue-50 border-blue-100' : modal.type === 'CALIBRATE' ? 'bg-amber-50 border-amber-100' : 'bg-emerald-50 border-emerald-100'}`}>
                            <h3 className="text-lg font-black text-slate-800">
                                {modal.type === 'ADD' && <><i className="fas fa-microchip text-emerald-600 mr-2"></i> Khai báo Mạch Mới</>}
                                {modal.type === 'REPLACE' && <><i className="fas fa-exchange-alt text-blue-600 mr-2"></i> Thay Thế Bo Mạch</>}
                                {modal.type === 'CALIBRATE' && <><i className="fas fa-sliders-h text-amber-600 mr-2"></i> Hiệu Chuẩn Cảm Biến</>}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 font-medium">
                                {modal.type === 'REPLACE' && "Nhập MAC mới để thay thế cho mạch hỏng. Mọi lịch sử dữ liệu sẽ được giữ nguyên."}
                                {modal.type === 'CALIBRATE' && `Đang căn chỉnh sai số cho mạch ${modal.device?.device_id}`}
                            </p>
                        </div>

                        {/* Modal Body (Form) */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            
                            {/* Form Thêm mới / Thay thế MAC */}
                            {(modal.type === 'ADD' || modal.type === 'REPLACE') && (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tên Thiết bị / Vị trí</label>
                                        <input 
                                            type="text" required name="name" value={formData.name} onChange={handleInputChange}
                                            placeholder="VD: Cảm biến góc Tây Bắc"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                            {modal.type === 'REPLACE' ? 'Địa chỉ MAC Mới (Bắt buộc)' : 'Mã MAC (Device ID)'}
                                        </label>
                                        <input 
                                            type="text" required name="device_id" value={formData.device_id} onChange={handleInputChange}
                                            placeholder="VD: A4:CF:12:3D:56:78"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono text-slate-700" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phân bổ Khu vực (Tùy chọn)</label>
                                        <select 
                                            name="zone_id" value={formData.zone_id} onChange={handleInputChange}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium text-slate-700"
                                        >
                                            <option value="">-- Cất trong kho (Chưa phân bổ) --</option>
                                            {zones.map(z => (
                                                <option key={z.zone_id} value={z.zone_id}>{z.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            )}

                            {/* Form Hiệu chuẩn */}
                            {modal.type === 'CALIBRATE' && (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bù trừ Nhiệt độ (°C)</label>
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="number" step="0.1" name="temp_offset" value={formData.temp_offset} onChange={handleInputChange}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono text-slate-700" 
                                            />
                                            <span className="text-sm font-bold text-slate-400 w-16 text-right">độ C</span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1">VD: Cảm biến báo 32°C, thực tế 30°C {'->'} Nhập -2.0</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bù trừ Độ ẩm (%)</label>
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="number" step="0.5" name="humid_offset" value={formData.humid_offset} onChange={handleInputChange}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono text-slate-700" 
                                            />
                                            <span className="text-sm font-bold text-slate-400 w-16 text-right">%</span>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Nút hành động Modal */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                                <button type="button" onClick={closeModal} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">
                                    Hủy bỏ
                                </button>
                                <button 
                                    type="submit" disabled={isSubmitting}
                                    className={`px-5 py-2.5 rounded-xl font-bold text-white transition-all shadow-lg ${modal.type === 'REPLACE' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : modal.type === 'CALIBRATE' ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-200' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'} disabled:opacity-50 flex items-center`}
                                >
                                    {isSubmitting ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-save mr-2"></i>}
                                    Lưu thay đổi
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TechDeviceManagement;
// import React, { useState, useEffect } from 'react';
// import { api } from '../../services/api';

// const TechDeviceManagement = () => {
//     const [devices, setDevices] = useState([]);
//     const [isLoading, setIsLoading] = useState(true);

//     useEffect(() => {
//         const fetchDevices = async () => {
//             try {
//                 const data = await api.devices.getAll();
//                 setDevices(data);
//             } catch (error) {
//                 console.error("Lỗi lấy danh sách thiết bị", error);
//             } finally {
//                 setIsLoading(false);
//             }
//         };
//         fetchDevices();
//     }, []);

//     if (isLoading) return <div className="p-10 text-center text-slate-400 font-bold animate-pulse">Đang tải dữ liệu kho thiết bị...</div>;

//     return (
//         <div className="animate-fade-in max-w-7xl mx-auto pb-10">
//             <div className="mb-8 flex justify-between items-end">
//                 <div>
//                     <h2 className="text-3xl font-black text-slate-800 tracking-tight">Kho Thiết Bị (Hardware)</h2>
//                     <p className="text-slate-500 font-medium mt-1">Quản lý địa chỉ MAC, thay thế phần cứng và hiệu chuẩn cảm biến.</p>
//                 </div>
//                 <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold transition-colors shadow-lg shadow-emerald-200">
//                     <i className="fas fa-plus mr-2"></i> Khai báo Mạch mới
//                 </button>
//             </div>

//             <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
//                 <div className="overflow-x-auto">
//                     <table className="w-full text-left">
//                         <thead className="bg-slate-50 border-b border-slate-100">
//                             <tr>
//                                 <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Tên Thiết Bị / Zone</th>
//                                 <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Mã MAC (Device ID)</th>
//                                 <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Trạng thái</th>
//                                 <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Thao tác</th>
//                             </tr>
//                         </thead>
//                         <tbody className="divide-y divide-slate-50">
//                             {devices.length === 0 ? (
//                                 <tr><td colSpan="4" className="text-center py-10 text-slate-400">Kho trống.</td></tr>
//                             ) : devices.map(dev => (
//                                 <tr key={dev.device_id} className="hover:bg-slate-50 transition-colors">
//                                     <td className="px-6 py-4">
//                                         <div className="font-bold text-slate-800">{dev.name}</div>
//                                         <div className="text-xs text-emerald-600 font-bold mt-1 uppercase">
//                                             {dev.zone_id ? `Zone #${dev.zone_id}` : 'Trong kho (Chưa gán)'}
//                                         </div>
//                                     </td>
//                                     <td className="px-6 py-4">
//                                         <div className="font-mono text-sm bg-slate-100 px-2 py-1 rounded border border-slate-200 inline-block text-slate-600">
//                                             {dev.device_id}
//                                         </div>
//                                     </td>
//                                     <td className="px-6 py-4 text-center">
//                                         {dev.status === 'ONLINE' ? (
//                                             <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
//                                         ) : (
//                                             <span className="w-2.5 h-2.5 bg-rose-500 rounded-full inline-block"></span>
//                                         )}
//                                     </td>
//                                     <td className="px-6 py-4 text-right">
//                                         <div className="flex justify-end gap-2">
//                                             <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Đổi địa chỉ MAC (Thay bo mạch)">
//                                                 <i className="fas fa-exchange-alt"></i>
//                                             </button>
//                                             <button className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Hiệu chuẩn cảm biến (Calibration)">
//                                                 <i className="fas fa-sliders-h"></i>
//                                             </button>
//                                         </div>
//                                     </td>
//                                 </tr>
//                             ))}
//                         </tbody>
//                     </table>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default TechDeviceManagement;