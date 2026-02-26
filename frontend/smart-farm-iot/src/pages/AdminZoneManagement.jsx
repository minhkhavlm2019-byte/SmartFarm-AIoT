import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { toast } from 'react-toastify';

const AdminZoneManagement = () => {
    const [zones, setZones] = useState([]);
    const [techs, setTechs] = useState([]);    // Danh sách Kỹ thuật viên
    const [farmers, setFarmers] = useState([]); // Danh sách Nông dân
    const [isLoading, setIsLoading] = useState(true);
    
    const [showModal, setShowModal] = useState(false);
    const [editingZone, setEditingZone] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        crop_type: 'Rau Cải',
        technician_id: '', // Lưu ID kỹ thuật viên
        farmer_id: ''      // Lưu ID nông dân
    });

    // --- 1. TẢI DỮ LIỆU ---
    const fetchData = async () => {
        setIsLoading(true);
        try {
            // Gọi song song: Lấy Zone + Lấy tất cả User
            const [zonesRes, usersRes] = await Promise.all([
                api.zones.getAll(),
                api.users.getAll()
            ]);
            
            setZones(zonesRes);

            // Lọc User theo Role để đổ vào Dropdown
            // Lưu ý: Kiểm tra đúng key 'role' trả về từ API (admin/technology/farmer)
            setTechs(usersRes.filter(u => u.role === 'technology'));
            setFarmers(usersRes.filter(u => u.role === 'farmer'));

        } catch (error) {
            toast.error("Không thể tải dữ liệu hệ thống");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // --- 2. XỬ LÝ FORM ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Chuẩn hóa dữ liệu: Chuyển chuỗi rỗng thành null
        const payload = {
            ...formData,
            technician_id: formData.technician_id ? parseInt(formData.technician_id) : null,
            farmer_id: formData.farmer_id ? parseInt(formData.farmer_id) : null
        };

        try {
            if (editingZone) {
                await api.zones.update(editingZone.zone_id, payload);
                toast.success("Cập nhật Zone thành công!");
            } else {
                await api.zones.create(payload);
                toast.success("Tạo Zone mới thành công!");
            }
            closeModal();
            fetchData();
        } catch (error) {
            toast.error(error.message || "Có lỗi xảy ra");
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa Zone này? Mọi thiết bị bên trong cũng sẽ bị ảnh hưởng!")) {
            try {
                await api.zones.delete(id);
                toast.success("Đã xóa Zone");
                fetchData();
            } catch (error) {
                toast.error("Không thể xóa Zone này");
            }
        }
    };

    // --- 3. MODAL ---
    const openModal = (zone = null) => {
        if (zone) {
            setEditingZone(zone);
            setFormData({
                name: zone.name,
                description: zone.description || '',
                crop_type: zone.crop_type || 'Rau Cải',
                technician_id: zone.technician_id || '',
                farmer_id: zone.farmer_id || ''
            });
        } else {
            setEditingZone(null);
            setFormData({ name: '', description: '', crop_type: 'Rau Cải', technician_id: '', farmer_id: '' });
        }
        setShowModal(true);
    };

    const closeModal = () => { setShowModal(false); setEditingZone(null); };

    // Helper: Tìm tên user theo ID để hiển thị lên bảng
    const getUserName = (id, list) => {
        if (!id) return <span className="text-slate-300 italic">-- Chưa gán --</span>;
        const user = list.find(u => u.user_id === id);
        return user ? <span className="font-medium text-slate-700">{user.full_name || user.username}</span> : "Unknown";
    };

    if (isLoading) return <div className="p-10 text-center animate-pulse">Đang tải dữ liệu...</div>;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Quản lý Khu vực (Zones)</h2>
                    <p className="text-slate-500 text-sm">Phân quyền Tech/Farmer cho từng vùng trồng</p>
                </div>
                <button onClick={() => openModal()} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg transition-all flex gap-2">
                    <i className="fas fa-plus"></i> Thêm Zone
                </button>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Tên Zone</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Loại cây</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Kỹ thuật viên</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Nông dân</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {zones.map((zone) => (
                            <tr key={zone.zone_id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-emerald-800">{zone.name}</div>
                                    <div className="text-xs text-slate-400">{zone.description}</div>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600">{zone.crop_type}</td>
                                
                                {/* Hiển thị tên Tech */}
                                <td className="px-6 py-4 text-sm">{getUserName(zone.technician_id, techs)}</td>
                                
                                {/* Hiển thị tên Farmer */}
                                <td className="px-6 py-4 text-sm">{getUserName(zone.farmer_id, farmers)}</td>
                                
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => openModal(zone)} className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg mr-2"><i className="fas fa-edit"></i></button>
                                    <button onClick={() => handleDelete(zone.zone_id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg"><i className="fas fa-trash"></i></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {zones.length === 0 && <div className="p-8 text-center text-slate-400">Chưa có dữ liệu Zone.</div>}
            </div>

            {/* MODAL FORM */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg p-8 animate-slide-up">
                        <h3 className="text-2xl font-bold text-slate-800 mb-6">{editingZone ? 'Cập nhật Zone' : 'Tạo Zone Mới'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tên Khu vực</label>
                                <input type="text" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none" 
                                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Loại cây trồng</label>
                                    <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none" 
                                        value={formData.crop_type} onChange={e => setFormData({...formData, crop_type: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mô tả ngắn</label>
                                    <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none" 
                                        value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                                </div>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                                <h4 className="text-sm font-bold text-slate-700 border-b border-slate-200 pb-2">Phân công Nhân sự</h4>
                                
                                {/* Dropdown chọn Tech */}
                                <div>
                                    <label className="block text-xs font-bold text-blue-500 uppercase mb-1">Kỹ thuật viên (Tech)</label>
                                    <select className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white outline-none"
                                        value={formData.technician_id} onChange={e => setFormData({...formData, technician_id: e.target.value})}>
                                        <option value="">-- Chưa gán --</option>
                                        {techs.map(u => <option key={u.user_id} value={u.user_id}>{u.full_name} ({u.username})</option>)}
                                    </select>
                                </div>

                                {/* Dropdown chọn Farmer */}
                                <div>
                                    <label className="block text-xs font-bold text-green-600 uppercase mb-1">Nông dân (Farmer)</label>
                                    <select className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white outline-none"
                                        value={formData.farmer_id} onChange={e => setFormData({...formData, farmer_id: e.target.value})}>
                                        <option value="">-- Chưa gán --</option>
                                        {farmers.map(u => <option key={u.user_id} value={u.user_id}>{u.full_name} ({u.username})</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={closeModal} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-100 rounded-xl">Hủy</button>
                                <button type="submit" className="flex-1 py-3 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg">Lưu lại</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminZoneManagement;
// import React, { useState, useEffect } from 'react';
// import { api } from '../services/api';
// import { toast } from 'react-toastify';

// const AdminZoneManagement = () => {
//     const [zones, setZones] = useState([]);
//     const [isLoading, setIsLoading] = useState(true);
//     const [showModal, setShowModal] = useState(false);
//     const [editingZone, setEditingZone] = useState(null);
//     const [formData, setFormData] = useState({
//         name: '',
//         description: ''
//     });

//     // 1. Tải danh sách Zone từ Backend
//     const fetchZones = async () => {
//         setIsLoading(true);
//         try {
//             const data = await api.zones.getAll(); // Đảm bảo backend đã có route GET /zones
//             setZones(data);
//         } catch (error) {
//             toast.error("Không thể tải danh sách khu vực");
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     useEffect(() => { fetchZones(); }, []);

//     // 2. Xử lý Thêm/Sửa Zone
//     const handleSubmit = async (e) => {
//         e.preventDefault();
//         try {
//             if (editingZone) {
//                 await api.zones.update(editingZone.id, formData);
//                 toast.success("Cập nhật khu vực thành công");
//             } else {
//                 await api.zones.create(formData);
//                 toast.success("Thêm khu vực mới thành công");
//             }
//             closeModal();
//             fetchZones();
//         } catch (error) {
//             toast.error(error.response?.data?.detail || "Lỗi thao tác");
//         }
//     };

//     // 3. Xử lý Xóa Zone
//     const handleDelete = async (id, name) => {
//         if (window.confirm(`Bạn có chắc muốn xóa [${name}]? Lưu ý: Các thiết bị thuộc khu vực này sẽ bị hủy liên kết.`)) {
//             try {
//                 await api.zones.delete(id);
//                 toast.success("Đã xóa khu vực");
//                 fetchZones();
//             } catch (error) {
//                 toast.error("Không thể xóa khu vực đang có thiết bị hoạt động");
//             }
//         }
//     };

//     const openModal = (zone = null) => {
//         if (zone) {
//             setEditingZone(zone);
//             setFormData({ name: zone.name, description: zone.description || '' });
//         } else {
//             setEditingZone(null);
//             setFormData({ name: '', description: '' });
//         }
//         setShowModal(true);
//     };

//     const closeModal = () => {
//         setShowModal(false);
//         setEditingZone(null);
//     };

//     return (
//         <div className="space-y-8 animate-fade-in">
//             {/* Header Section */}
//             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
//                 <div>
//                     <h2 className="text-2xl font-bold text-slate-800">Quản lý Khu vực (Zones)</h2>
//                     <p className="text-slate-500 text-sm">Thiết lập các phân vùng canh tác cho nông trại</p>
//                 </div>
//                 <button 
//                     onClick={() => openModal()}
//                     className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-2"
//                 >
//                     <i className="fas fa-map-plus"></i> Thêm Khu Vực Mới
//                 </button>
//             </div>

//             {/* Zone Grid Display */}
//             {isLoading ? (
//                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
//                     {[1, 2, 3].map(i => <div key={i} className="h-48 bg-slate-100 rounded-[2rem]"></div>)}
//                 </div>
//             ) : (
//                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//                     {zones.map((zone) => (
//                         <div key={zone.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 hover:shadow-xl hover:border-emerald-200 transition-all group relative overflow-hidden">
//                             {/* Icon trang trí ẩn dưới nền */}
//                             <i className="fas fa-seedling absolute -right-4 -bottom-4 text-8xl text-emerald-50 opacity-0 group-hover:opacity-100 transition-all duration-500 transform group-hover:rotate-12"></i>
                            
//                             <div className="relative z-10">
//                                 <div className="flex justify-between items-start mb-4">
//                                     <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-xl shadow-inner">
//                                         <i className="fas fa-map-marked-alt"></i>
//                                     </div>
//                                     <div className="flex gap-1">
//                                         <button onClick={() => openModal(zone)} className="p-2 text-slate-400 hover:text-blue-500 transition-colors"><i className="fas fa-edit"></i></button>
//                                         <button onClick={() => handleDelete(zone.id, zone.name)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><i className="fas fa-trash-alt"></i></button>
//                                     </div>
//                                 </div>
                                
//                                 <h3 className="text-lg font-bold text-slate-800 mb-1">{zone.name}</h3>
//                                 <p className="text-sm text-slate-500 mb-4 line-clamp-2 h-10">{zone.description || 'Không có mô tả cho khu vực này.'}</p>
                                
//                                 <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
//                                     <span>ID: {zone.id}</span>
//                                     <span className="text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">Khu vực đang mở</span>
//                                 </div>
//                             </div>
//                         </div>
//                     ))}
//                 </div>
//             )}

//             {zones.length === 0 && !isLoading && (
//                 <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-slate-300">
//                     <i className="fas fa-map-signs text-5xl text-slate-200 mb-4"></i>
//                     <p className="text-slate-500">Chưa có khu vực nào được tạo. Hãy bắt đầu phân vùng nông trại của bạn!</p>
//                 </div>
//             )}

//             {/* Modal Form */}
//             {showModal && (
//                 <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
//                     <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeModal}></div>
//                     <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden relative animate-slide-up">
//                         <div className="bg-emerald-800 p-8 text-white">
//                             <h3 className="text-2xl font-bold">{editingZone ? 'Chỉnh sửa Khu vực' : 'Tạo Khu vực mới'}</h3>
//                             <p className="text-emerald-300/80 text-sm mt-1">Phân chia nông trại thành các phân vùng quản lý</p>
//                         </div>
                        
//                         <form onSubmit={handleSubmit} className="p-8 space-y-5">
//                             <div>
//                                 <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Tên khu vực</label>
//                                 <input 
//                                     type="text" required 
//                                     placeholder="VD: Nhà màng A1, Vườn rau cải..."
//                                     className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
//                                     value={formData.name}
//                                     onChange={e => setFormData({...formData, name: e.target.value})}
//                                 />
//                             </div>
//                             <div>
//                                 <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Mô tả chi tiết</label>
//                                 <textarea 
//                                     rows="3"
//                                     placeholder="Ghi chú về diện tích, loại cây trồng hoặc vị trí..."
//                                     className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all resize-none"
//                                     value={formData.description}
//                                     onChange={e => setFormData({...formData, description: e.target.value})}
//                                 />
//                             </div>
                            
//                             <div className="flex gap-4 pt-4">
//                                 <button type="button" onClick={closeModal} className="flex-1 py-4 rounded-2xl font-bold text-slate-400 bg-slate-50 hover:bg-slate-100 transition-all">Hủy</button>
//                                 <button type="submit" className="flex-1 py-4 rounded-2xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-200 transition-all">
//                                     {editingZone ? 'Lưu thay đổi' : 'Tạo khu vực'}
//                                 </button>
//                             </div>
//                         </form>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// };

// export default AdminZoneManagement;