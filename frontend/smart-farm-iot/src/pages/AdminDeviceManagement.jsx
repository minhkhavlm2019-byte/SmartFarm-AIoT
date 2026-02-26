import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { toast } from 'react-toastify';

const AdminDeviceManagement = () => {
    const [devices, setDevices] = useState([]);
    const [zones, setZones] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingDevice, setEditingDevice] = useState(null);
    const [formData, setFormData] = useState({
        device_id: '',
        name: '',
        location: '',
        zone_id: ''
    });

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [deviceRes, zoneRes] = await Promise.all([
                api.devices.getAll(),
                api.zones.getAll()
            ]);
            setDevices(deviceRes);
            setZones(zoneRes);
        } catch (error) {
            toast.error("Không thể đồng bộ dữ liệu hệ thống");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // --- CHUẨN HÓA DỮ LIỆU ĐỂ TRÁNH LỖI 422 ---
        // 1. Ép kiểu zone_id sang Integer hoặc null
        const zoneIdInt = formData.zone_id ? parseInt(formData.zone_id) : null;

        try {
            if (editingDevice) {
                // CHỈ gửi các trường mà DeviceUpdate trong schemas/device.py cho phép
                const updatePayload = {
                    name: formData.name,
                    zone_id: zoneIdInt
                };
                await api.devices.update(editingDevice.device_id, updatePayload);
                toast.success("Cập nhật Node thành công");
            } else {
                // Gửi đầy đủ trường cho DeviceCreate
                const createPayload = {
                    device_id: formData.device_id,
                    name: formData.name,
                    zone_id: zoneIdInt
                    // location: formData.location // Bỏ nếu DeviceCreate không nhận location
                };
                await api.devices.create(createPayload);
                toast.success("Đăng ký Node mới thành công");
            }
            closeModal();
            fetchData();
        } catch (error) {
            // Hiển thị chi tiết lỗi từ FastAPI để dễ debug
            const errorDetail = error.response?.data?.detail;
            const errorMsg = typeof errorDetail === 'string' ? errorDetail : "Dữ liệu không hợp lệ (422)";
            toast.error(`Lỗi: ${errorMsg}`);
            console.error("FastAPI Error Detail:", errorDetail);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm(`Xác nhận gỡ bỏ thiết bị ${id}?`)) {
            try {
                await api.devices.delete(id);
                toast.success("Đã xóa thiết bị");
                fetchData();
            } catch (error) {
                toast.error("Lỗi xóa thiết bị");
            }
        }
    };

    const openModal = (device = null) => {
        if (device) {
            setEditingDevice(device);
            setFormData({
                device_id: device.device_id,
                name: device.name,
                location: device.location || '',
                zone_id: device.zone_id || ''
            });
        } else {
            setEditingDevice(null);
            setFormData({ device_id: '', name: '', location: '', zone_id: '' });
        }
        setShowModal(true);
    };

    const closeModal = () => { setShowModal(false); setEditingDevice(null); };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Quản trị Node Thiết bị</h2>
                    <p className="text-slate-500 text-sm">Cấu hình định danh và phân vùng cho ESP32</p>
                </div>
                <button onClick={() => openModal()} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-emerald-100 transition-all flex items-center gap-2 active:scale-95">
                    <i className="fas fa-plus"></i> Đăng ký Node
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">ID</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Tên Node</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Khu vực (Zone)</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase text-center">Trạng thái</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {devices.map((device) => (
                            <tr key={device.device_id} className="hover:bg-emerald-50/30 transition-colors group">
                                <td className="px-6 py-4"><span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-emerald-700 font-bold">{device.device_id}</span></td>
                                <td className="px-6 py-4 font-semibold text-slate-700">{device.name}</td>
                                <td className="px-6 py-4">
                                    <span className="text-sm text-slate-600">{zones.find(z => z.zone_id === device.zone_id)?.name || 'Chưa gán'}</span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${device.status === 'ONLINE' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                                        {device.status || 'OFFLINE'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openModal(device)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg mr-1"><i className="fas fa-edit"></i></button>
                                    <button onClick={() => handleDelete(device.device_id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><i className="fas fa-trash"></i></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
                        <div className="bg-emerald-800 p-8 text-white">
                            <h3 className="text-2xl font-bold">{editingDevice ? 'Cập nhật Node' : 'Đăng ký Node mới'}</h3>
                            <p className="text-emerald-200/60 text-sm mt-1">Thông tin phải khớp với Client ID trong ESP32</p>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Device ID (MAC Address)</label>
                                <input disabled={!!editingDevice} type="text" required className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:border-emerald-500 outline-none font-mono disabled:bg-slate-50" value={formData.device_id} onChange={e => setFormData({...formData, device_id: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Tên thiết bị</label>
                                <input type="text" required className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:border-emerald-500 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Gán vào Khu vực (Zone)</label>
                                <select required className="w-full px-5 py-3 rounded-2xl border border-slate-200 focus:border-emerald-500 outline-none bg-white" value={formData.zone_id} onChange={e => setFormData({...formData, zone_id: e.target.value})}>
                                    <option value="">-- Chọn Zone --</option>
                                    {zones.map(z => <option key={z.zone_id} value={z.zone_id}>{z.name}</option>)}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={closeModal} className="flex-1 py-4 font-bold text-slate-400 hover:bg-slate-50 rounded-2xl transition-all">Hủy</button>
                                <button type="submit" className="flex-1 py-4 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-2xl shadow-lg transition-all">Lưu</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDeviceManagement;
// import React, { useState, useEffect } from 'react';
// import { api } from '../services/api';
// import { toast } from 'react-toastify';

// const AdminDeviceManagement = () => {
//     // --- 1. STATE QUẢN LÝ ---
//     const [devices, setDevices] = useState([]);
//     const [zones, setZones] = useState([]); // Danh sách Zone cho Dropdown
//     const [isLoading, setIsLoading] = useState(true);
//     const [showModal, setShowModal] = useState(false);
//     const [editingDevice, setEditingDevice] = useState(null);
//     const [formData, setFormData] = useState({
//         device_id: '',
//         name: '',
//         location: '',
//         zone_id: '' // Sẽ lưu ID của Zone được chọn
//     });

//     // --- 2. LOGIC LẤY DỮ LIỆU ---
//     const fetchData = async () => {
//         setIsLoading(true);
//         try {
//             // Gọi song song cả Device và Zone
//             const [deviceRes, zoneRes] = await Promise.all([
//                 api.devices.getAll(), // Khớp với router.get("/") trong devices.py
//                 api.zones.getAll()    // Lấy danh sách vùng để chọn
//             ]);
//             setDevices(deviceRes);
//             setZones(zoneRes);
//         } catch (error) {
//             toast.error("Lỗi: Không thể đồng bộ dữ liệu từ máy chủ");
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     useEffect(() => { fetchData(); }, []);

//     // --- 3. XỬ LÝ FORM (THÊM/SỬA) ---
//     const handleSubmit = async (e) => {
//         e.preventDefault();
        
//         // Kiểm tra logic trước khi gửi
//         if (!formData.zone_id) {
//             return toast.warning("Vui lòng gán thiết bị vào một Khu vực (Zone)");
//         }

//         try {
//             if (editingDevice) {
//                 // Cập nhật: router.put("/{device_id}")
//                 await api.devices.update(editingDevice.device_id, formData);
//                 toast.success("Cập nhật Node thành công!");
//             } else {
//                 // Thêm mới: router.post("/")
//                 await api.devices.create(formData);
//                 toast.success("Đã đăng ký Node mới vào hệ thống!");
//             }
//             closeModal();
//             fetchData();
//         } catch (error) {
//             toast.error(error.response?.data?.detail || "Lỗi thao tác dữ liệu");
//         }
//     };

//     // --- 4. XỬ LÝ XÓA ---
//     const handleDelete = async (id) => {
//         if (window.confirm(`⚠️ CẢNH BÁO: Xóa Node [${id}] sẽ làm mất liên kết dữ liệu. Bạn chắc chắn chứ?`)) {
//             try {
//                 await api.devices.delete(id);
//                 toast.success("Đã gỡ thiết bị khỏi hệ thống");
//                 fetchData();
//             } catch (error) {
//                 toast.error("Không thể xóa thiết bị này");
//             }
//         }
//     };

//     // --- 5. ĐIỀU KHIỂN MODAL ---
//     const openModal = (device = null) => {
//         if (device) {
//             setEditingDevice(device);
//             setFormData({
//                 device_id: device.device_id,
//                 name: device.name,
//                 location: device.location || '',
//                 zone_id: device.zone_id || ''
//             });
//         } else {
//             setEditingDevice(null);
//             setFormData({ device_id: '', name: '', location: '', zone_id: '' });
//         }
//         setShowModal(true);
//     };

//     const closeModal = () => {
//         setShowModal(false);
//         setEditingDevice(null);
//     };

//     if (isLoading) return <div className="p-10 text-center text-emerald-600 animate-pulse">Đang đồng bộ thiết bị...</div>;

//     return (
//         <div className="space-y-6 animate-fade-in">
//             {/* Tiêu đề & Nút thêm */}
//             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
//                 <div>
//                     <h2 className="text-2xl font-bold text-slate-800">Quản trị Hệ thống Node</h2>
//                     <p className="text-slate-500 text-sm">Quản lý định danh ESP32 và phân vùng canh tác </p>
//                 </div>
//                 <button 
//                     onClick={() => openModal()}
//                     className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-2"
//                 >
//                     <i className="fas fa-plus-circle"></i> Đăng ký Node mới
//                 </button>
//             </div>

//             {/* Bảng danh sách thiết bị */}
//             <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
//                 <div className="overflow-x-auto">
//                     <table className="w-full text-left">
//                         <thead className="bg-slate-50/80 border-b border-slate-200">
//                             <tr>
//                                 <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Mã định danh (ID)</th>
//                                 <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Tên hiển thị</th>
//                                 <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Khu vực quản lý</th>
//                                 <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Trạng thái</th>
//                                 <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Thao tác</th>
//                             </tr>
//                         </thead>
//                         <tbody className="divide-y divide-slate-100">
//                             {devices.map((device) => (
//                                 <tr key={device.device_id} className="hover:bg-emerald-50/40 transition-colors group">
//                                     <td className="px-6 py-4">
//                                         <span className="font-mono text-sm bg-slate-100 px-2 py-1 rounded text-emerald-700 font-bold border border-slate-200">
//                                             {device.device_id}
//                                         </span>
//                                     </td>
//                                     <td className="px-6 py-4 font-semibold text-slate-700">{device.name}</td>
//                                     <td className="px-6 py-4">
//                                         <div className="flex flex-col">
//                                             <span className="text-sm text-slate-600 font-medium">
//                                                 {zones.find(z => z.id === device.zone_id)?.name || 'Chưa gán khu vực'}
//                                             </span>
//                                             <span className="text-[10px] text-slate-400 uppercase italic">{device.location}</span>
//                                         </div>
//                                     </td>
//                                     <td className="px-6 py-4 text-center">
//                                         <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold shadow-sm
//                                             ${device.status === 'ONLINE' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
//                                             <span className={`w-1.5 h-1.5 rounded-full ${device.status === 'ONLINE' ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></span>
//                                             {device.status || 'OFFLINE'}
//                                         </span>
//                                     </td>
//                                     <td className="px-6 py-4 text-right">
//                                         <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
//                                             <button onClick={() => openModal(device)} className="p-2 text-blue-500 hover:bg-blue-100 rounded-xl transition-all" title="Sửa">
//                                                 <i className="fas fa-edit"></i>
//                                             </button>
//                                             <button onClick={() => handleDelete(device.device_id)} className="p-2 text-red-500 hover:bg-red-100 rounded-xl transition-all" title="Xóa">
//                                                 <i className="fas fa-trash-alt"></i>
//                                             </button>
//                                         </div>
//                                     </td>
//                                 </tr>
//                             ))}
//                         </tbody>
//                     </table>
//                 </div>
//                 {devices.length === 0 && (
//                     <div className="py-20 text-center bg-slate-50/50">
//                         <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
//                             <i className="fas fa-microchip text-slate-300 text-2xl"></i>
//                         </div>
//                         <p className="text-slate-400 font-medium">Hệ thống chưa có Node nào được đăng ký.</p>
//                     </div>
//                 )}
//             </div>

//             {/* Modal Thêm/Sửa Node */}
//             {showModal && (
//                 <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
//                     <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={closeModal}></div>
//                     <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden relative animate-slide-up border border-white/20">
//                         <div className="bg-gradient-to-r from-emerald-800 to-teal-900 p-8 text-white relative">
//                             <h3 className="text-2xl font-bold">{editingDevice ? 'Cập nhật thông tin Node' : 'Đăng ký Node mới'}</h3>
//                             <p className="text-emerald-200/70 text-sm mt-1">Vui lòng nhập đúng Device ID khớp với mã nguồn ESP32 </p>
//                             <button onClick={closeModal} className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors">
//                                 <i className="fas fa-times text-xl"></i>
//                             </button>
//                         </div>

//                         <form onSubmit={handleSubmit} className="p-8 space-y-5">
//                             <div className="space-y-4">
//                                 {/* Device ID (Chỉ cho phép nhập khi thêm mới) */}
//                                 <div>
//                                     <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Mã định danh (MQTT Client ID)</label>
//                                     <input 
//                                         disabled={!!editingDevice}
//                                         type="text" required 
//                                         placeholder="Ví dụ: ESP32_GARDEN_01"
//                                         className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-mono text-emerald-800 disabled:bg-slate-50 disabled:text-slate-400"
//                                         value={formData.device_id}
//                                         onChange={e => setFormData({...formData, device_id: e.target.value})}
//                                     />
//                                 </div>

//                                 {/* Tên thiết bị */}
//                                 <div>
//                                     <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Tên gợi nhớ</label>
//                                     <input 
//                                         type="text" required 
//                                         placeholder="Ví dụ: Hệ thống tưới Vườn Lan"
//                                         className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
//                                         value={formData.name}
//                                         onChange={e => setFormData({...formData, name: e.target.value})}
//                                     />
//                                 </div>

//                                 <div className="grid grid-cols-2 gap-4">
//                                     {/* Chọn Zone (Dropdown) */}
//                                     <div>
//                                         <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Khu vực (Zone)</label>
//                                         <select 
//                                             required
//                                             className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all bg-white appearance-none"
//                                             value={formData.zone_id}
//                                             onChange={e => setFormData({...formData, zone_id: e.target.value})}
//                                         >
//                                             <option value="">-- Chọn Zone --</option>
//                                             {zones.map(zone => (
//                                                 <option key={zone.id} value={zone.id}>{zone.name}</option>
//                                             ))}
//                                         </select>
//                                     </div>

//                                     {/* Vị trí */}
//                                     <div>
//                                         <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Vị trí cụ thể</label>
//                                         <input 
//                                             type="text" 
//                                             placeholder="Góc Đông Nam"
//                                             className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
//                                             value={formData.location}
//                                             onChange={e => setFormData({...formData, location: e.target.value})}
//                                         />
//                                     </div>
//                                 </div>
//                             </div>

//                             <div className="flex gap-4 pt-4">
//                                 <button type="button" onClick={closeModal} className="flex-1 py-4 rounded-2xl font-bold text-slate-400 bg-slate-100 hover:bg-slate-200 transition-all">Hủy</button>
//                                 <button type="submit" className="flex-1 py-4 rounded-2xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-200 transition-all">
//                                     {editingDevice ? 'Lưu cập nhật' : 'Xác nhận đăng ký'}
//                                 </button>
//                             </div>
//                         </form>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// };

// export default AdminDeviceManagement;
// import React, { useState, useEffect } from 'react';
// import { api } from '../services/api';
// import { toast } from 'react-toastify';

// const AdminDeviceManagement = () => {
//     const [devices, setDevices] = useState([]);
//     const [isLoading, setIsLoading] = useState(true);
//     const [showModal, setShowModal] = useState(false);
//     const [editingDevice, setEditingDevice] = useState(null);
//     const [formData, setFormData] = useState({
//         device_id: '',
//         name: '',
//         location: '',
//         zone_id: ''
//     });

//     // 1. Lấy danh sách thiết bị từ Backend
//     const fetchDevices = async () => {
//         try {
//             const data = await api.devices.getAll(); // Khớp với router.get("/") 
//             setDevices(data);
//         } catch (error) {
//             toast.error("Không thể tải danh sách thiết bị");
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     useEffect(() => { fetchDevices(); }, []);

//     // 2. Xử lý Thêm/Sửa
//     const handleSubmit = async (e) => {
//         e.preventDefault();
//         try {
//             if (editingDevice) {
//                 await api.devices.update(editingDevice.device_id, formData); // router.put("/{device_id}") 
//                 toast.success("Cập nhật thiết bị thành công");
//             } else {
//                 await api.devices.create(formData); // router.post("/")
//                 toast.success("Thêm thiết bị mới thành công");
//             }
//             setShowModal(false);
//             fetchDevices();
//         } catch (error) {
//             toast.error(error.response?.data?.detail || "Đã có lỗi xảy ra");
//         }
//     };

//     // 3. Xử lý Xóa
//     const handleDelete = async (id) => {
//         if (window.confirm(`Bạn có chắc muốn xóa thiết bị ${id}? Dữ liệu lịch sử sẽ bị ảnh hưởng.`)) {
//             try {
//                 await api.devices.delete(id);
//                 toast.success("Đã xóa thiết bị");
//                 fetchDevices();
//             } catch (error) {
//                 toast.error("Không thể xóa thiết bị");
//             }
//         }
//     };

//     const openModal = (device = null) => {
//         if (device) {
//             setEditingDevice(device);
//             setFormData({ device_id: device.device_id, name: device.name, location: device.location, zone_id: device.zone_id || '' });
//         } else {
//             setEditingDevice(null);
//             setFormData({ device_id: '', name: '', location: '', zone_id: '' });
//         }
//         setShowModal(true);
//     };

//     return (
//         <div className="space-y-6 animate-fade-in">
//             {/* Header Area */}
//             <div className="flex justify-between items-center">
//                 <div>
//                     <h2 className="text-2xl font-bold text-slate-800">Quản lý Node Thiết bị</h2>
//                     <p className="text-slate-500 text-sm">Đăng ký và cấu hình các trạm ESP32 trong hệ thống</p>
//                 </div>
//                 <button 
//                     onClick={() => openModal()}
//                     className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-emerald-200 transition-all flex items-center gap-2"
//                 >
//                     <i className="fas fa-plus"></i> Thêm Node Mới
//                 </button>
//             </div>

//             {/* Device Table */}
//             <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
//                 <table className="w-full text-left border-collapse">
//                     <thead className="bg-slate-50 border-b border-slate-200">
//                         <tr>
//                             <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Device ID</th>
//                             <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Tên thiết bị</th>
//                             <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Vị trí / Zone</th>
//                             <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Trạng thái</th>
//                             <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Thao tác</th>
//                         </tr>
//                     </thead>
//                     <tbody className="divide-y divide-slate-100">
//                         {devices.map((device) => (
//                             <tr key={device.device_id} className="hover:bg-emerald-50/30 transition-colors">
//                                 <td className="px-6 py-4 font-mono text-sm text-emerald-700 font-bold">{device.device_id}</td>
//                                 <td className="px-6 py-4 font-medium text-slate-700">{device.name}</td>
//                                 <td className="px-6 py-4 text-slate-500 text-sm">
//                                     <i className="fas fa-map-marker-alt mr-2"></i>
//                                     {device.location || 'Chưa xác định'} {device.zone_id && `(Zone ${device.zone_id})`}
//                                 </td>
//                                 <td className="px-6 py-4">
//                                     <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
//                                         device.status === 'ONLINE' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'
//                                     }`}>
//                                         {device.status || 'OFFLINE'}
//                                     </span>
//                                 </td>
//                                 <td className="px-6 py-4 text-center space-x-2">
//                                     <button onClick={() => openModal(device)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all"><i className="fas fa-edit"></i></button>
//                                     <button onClick={() => handleDelete(device.device_id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"><i className="fas fa-trash"></i></button>
//                                 </td>
//                             </tr>
//                         ))}
//                     </tbody>
//                 </table>
//                 {devices.length === 0 && !isLoading && (
//                     <div className="p-20 text-center text-slate-400">
//                         <i className="fas fa-microchip text-4xl mb-3 opacity-20"></i>
//                         <p>Chưa có thiết bị nào được đăng ký.</p>
//                     </div>
//                 )}
//             </div>

//             {/* Modal Form */}
//             {showModal && (
//                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
//                     <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
//                         <div className="bg-emerald-900 p-6 text-white">
//                             <h3 className="text-xl font-bold">{editingDevice ? 'Cập nhật Node' : 'Đăng ký Node Mới'}</h3>
//                             <p className="text-emerald-300 text-xs opacity-80">Thông tin định danh thiết bị trên hệ thống</p>
//                         </div>
//                         <form onSubmit={handleSubmit} className="p-6 space-y-4">
//                             <div>
//                                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Device ID (Dùng cho MQTT)</label>
//                                 <input 
//                                     disabled={!!editingDevice}
//                                     type="text" required 
//                                     placeholder="VD: ESP32_WOKWI_01"
//                                     className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-slate-50 font-mono"
//                                     value={formData.device_id}
//                                     onChange={e => setFormData({...formData, device_id: e.target.value})}
//                                 />
//                             </div>
//                             <div>
//                                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tên gợi nhớ</label>
//                                 <input 
//                                     type="text" required 
//                                     placeholder="VD: Vườn Rau Cải A"
//                                     className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
//                                     value={formData.name}
//                                     onChange={e => setFormData({...formData, name: e.target.value})}
//                                 />
//                             </div>
//                             <div className="grid grid-cols-2 gap-4">
//                                 <div>
//                                     <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vị trí</label>
//                                     <input 
//                                         type="text" 
//                                         placeholder="Khu A"
//                                         className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
//                                         value={formData.location}
//                                         onChange={e => setFormData({...formData, location: e.target.value})}
//                                     />
//                                 </div>
//                                 <div>
//                                     <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Zone ID</label>
//                                     <input 
//                                         type="number" 
//                                         placeholder="1"
//                                         className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
//                                         value={formData.zone_id}
//                                         onChange={e => setFormData({...formData, zone_id: e.target.value})}
//                                     />
//                                 </div>
//                             </div>
//                             <div className="flex gap-3 pt-4">
//                                 <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all">Hủy</button>
//                                 <button type="submit" className="flex-1 py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all">
//                                     {editingDevice ? 'Lưu thay đổi' : 'Đăng ký ngay'}
//                                 </button>
//                             </div>
//                         </form>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// };

// export default AdminDeviceManagement;