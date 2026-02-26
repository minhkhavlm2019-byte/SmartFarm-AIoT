import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom'; // 1. Import hook điều hướng
import { api } from '../services/api';
import Button from '../components/common/Button';
import Header from '../components/layout/Header';
import { toast } from 'react-toastify'; // Thêm toast để thông báo đẹp hơn

const Zones = () => {
    const [zones, setZones] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [newZone, setNewZone] = useState({ name: '', desc: '', crop: '' });
    
    // 2. Khai báo hook
    const navigate = useNavigate();

    const loadZones = async () => {
        try {
            const data = await api.zones.getAll();
            if (data) setZones(data);
        } catch (error) {
            toast.error("Lỗi tải danh sách khu vực");
        }
    };

    useEffect(() => {
        loadZones();
    }, []);

    const handleDelete = async (id) => {
        if(window.confirm("Xác nhận xóa khu vực này? Mọi thiết bị bên trong sẽ mất liên kết!")) {
            try {
                await api.zones.delete(id);
                toast.success("Đã xóa khu vực");
                loadZones();
            } catch (error) {
                toast.error("Không thể xóa khu vực này");
            }
        }
    };

    const handleSubmit = async () => {
        if(!newZone.name) return toast.warning("Vui lòng nhập tên Zone!");
        
        try {
            await api.zones.create({ 
                name: newZone.name, 
                description: newZone.desc, 
                crop_type: newZone.crop 
            });
            toast.success("Tạo khu vực thành công");
            setShowModal(false);
            setNewZone({ name: '', desc: '', crop: '' });
            loadZones();
        } catch (error) {
            toast.error("Lỗi khi tạo khu vực");
        }
    };

    // Hàm chuyển hướng sang trang chi tiết
    const handleViewDetail = (zoneId) => {
        navigate(`/admin/zones/${zoneId}`);
    };

    return (
        <div className="animate-fade-in">
            <Header title="Khu Vực Canh Tác" />
            
            <div className="p-6">
                {/* Nút Tạo mới (Chỉ Admin mới thấy - Logic này nằm trong component Button) */}
                <div className="flex justify-end mb-6">
                    <Button onClick={() => setShowModal(true)} isAdminOnly variant="on">
                        <i className="fas fa-plus mr-2"></i> Tạo Khu Vực Mới
                    </Button>
                </div>

                {/* Grid hiển thị Zone */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {zones.length === 0 ? (
                        <p className="text-slate-500 col-span-full text-center py-10">Chưa có khu vực nào.</p>
                    ) : zones.map(zone => (
                        <div key={zone.zone_id} className="bg-white rounded-2xl p-6 shadow-sm border-l-4 border-emerald-500 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <i className="fas fa-seedling text-emerald-500"></i> {zone.name}
                                </h3>
                                <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-500">ID: {zone.zone_id}</span>
                            </div>
                            
                            <p className="text-sm text-slate-500 font-medium mb-1">
                                <i className="fas fa-leaf mr-1 text-emerald-400"></i> {zone.crop_type || 'Chưa rõ loại cây'}
                            </p>
                            <p className="text-slate-600 text-sm mb-4 line-clamp-2 min-h-[40px]">
                                {zone.description || 'Chưa có mô tả chi tiết'}
                            </p>
                            
                            {/* --- CÁC NÚT CHỨC NĂNG --- */}
                            <div className="flex gap-3 mt-4 border-t border-slate-100 pt-4">
                                {/* Nút Quản lý: Kỹ thuật viên bấm vào đây để xem Pin/Trạng thái */}
                                <button 
                                    onClick={() => handleViewDetail(zone.zone_id)}
                                    className="flex-1 bg-blue-50 text-blue-600 py-2 rounded-lg font-bold text-sm hover:bg-blue-100 transition-colors"
                                >
                                    <i className="fas fa-eye mr-1"></i> Quản lý
                                </button>

                                {/* Nút Xóa: Chỉ Admin */}
                                <Button 
                                    variant="danger" 
                                    isAdminOnly 
                                    onClick={() => handleDelete(zone.zone_id)}
                                    className="px-3"
                                >
                                    <i className="fas fa-trash"></i>
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal Tạo Zone */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
                        <div className="bg-emerald-600 p-4 text-white">
                            <h3 className="text-lg font-bold">Tạo Khu Vực Mới</h3>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Tên Khu Vực</label>
                                <input 
                                    type="text" 
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-emerald-500 outline-none"
                                    placeholder="Ví dụ: Nhà màng 1"
                                    value={newZone.name} 
                                    onChange={e => setNewZone({...newZone, name: e.target.value})} 
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Loại cây trồng</label>
                                <input 
                                    type="text" 
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-emerald-500 outline-none"
                                    placeholder="Ví dụ: Dưa lưới"
                                    value={newZone.crop} 
                                    onChange={e => setNewZone({...newZone, crop: e.target.value})} 
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Mô tả</label>
                                <textarea 
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-emerald-500 outline-none h-20 resize-none"
                                    placeholder="Mô tả ngắn về khu vực này..."
                                    value={newZone.desc} 
                                    onChange={e => setNewZone({...newZone, desc: e.target.value})} 
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 p-6 pt-0">
                            <button 
                                onClick={() => setShowModal(false)} 
                                className="flex-1 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                Hủy
                            </button>
                            <button 
                                onClick={handleSubmit} 
                                className="flex-1 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-lg transition-colors"
                            >
                                Lưu
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Zones;
// import React, { useEffect, useState } from 'react';
// import { api } from '../services/api';
// import Button from '../components/common/Button';
// import Header from '../components/layout/Header';

// const Zones = () => {
//     const [zones, setZones] = useState([]);
//     const [showModal, setShowModal] = useState(false);
//     const [newZone, setNewZone] = useState({ name: '', desc: '', crop: '' });

//     const loadZones = async () => {
//         const data = await api.zones.getAll();
//         if (data) setZones(data);
//     };

//     useEffect(() => {
//         loadZones();
//     }, []);

//     const handleDelete = async (id) => {
//         if(window.confirm("Xóa khu vực này?")) {
//             await api.zones.delete(id);
//             loadZones();
//         }
//     };

//     const handleSubmit = async () => {
//         if(!newZone.name) return alert("Nhập tên Zone!");
//         await api.zones.create({ 
//             name: newZone.name, 
//             description: newZone.desc, 
//             crop_type: newZone.crop 
//         });
//         setShowModal(false);
//         setNewZone({ name: '', desc: '', crop: '' });
//         loadZones();
//     };

//     return (
//         <>
//             <Header title="Khu Vực Canh Tác" />
            
//             <div style={{ padding: '20px' }}>
//                 <Button onClick={() => setShowModal(true)} isAdminOnly variant="on">
//                     <i className="fas fa-plus"></i> Tạo Khu Vực Mới
//                 </Button>

//                 <div className="zone-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'20px', marginTop:'20px' }}>
//                     {zones.length === 0 ? <p>Chưa có khu vực nào.</p> : zones.map(zone => (
//                         <div key={zone.zone_id} className="zone-card" style={{ background:'white', padding:'20px', borderRadius:'10px', borderLeft:'5px solid #27ae60', boxShadow:'0 2px 5px rgba(0,0,0,0.1)' }}>
//                             <h3><i className="fas fa-seedling"></i> {zone.name}</h3>
//                             <p style={{fontSize:'13px', color:'#7f8c8d'}}>{zone.crop_type || 'Chưa rõ loại cây'}</p>
//                             <p>{zone.description || 'Chưa có mô tả'}</p>
                            
//                             <div className="btn-group" style={{marginTop:'15px', display:'flex', gap:'10px'}}>
//                                 <Button variant="sm"><i className="fas fa-edit"></i> Quản lý</Button>
//                                 <Button variant="danger" className="btn-sm" isAdminOnly onClick={() => handleDelete(zone.zone_id)}>
//                                     <i className="fas fa-trash"></i>
//                                 </Button>
//                             </div>
//                         </div>
//                     ))}
//                 </div>
//             </div>

//             {/* Modal Tạo Zone (Tương tự Devices) */}
//             {showModal && (
//                 <div className="modal-overlay" style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center'}}>
//                     <div style={{background:'white', padding:'20px', borderRadius:'8px', width:'300px'}}>
//                         <h3>Tạo Khu Vực Mới</h3>
//                         <input type="text" placeholder="Tên Zone" value={newZone.name} onChange={e => setNewZone({...newZone, name: e.target.value})} style={{width:'100%', marginBottom:'10px', padding:'8px'}} />
//                         <input type="text" placeholder="Loại cây" value={newZone.crop} onChange={e => setNewZone({...newZone, crop: e.target.value})} style={{width:'100%', marginBottom:'10px', padding:'8px'}} />
//                         <input type="text" placeholder="Mô tả" value={newZone.desc} onChange={e => setNewZone({...newZone, desc: e.target.value})} style={{width:'100%', marginBottom:'10px', padding:'8px'}} />
//                         <div style={{textAlign:'right'}}>
//                             <Button variant="off" onClick={() => setShowModal(false)} style={{marginRight:10}}>Hủy</Button>
//                             <Button variant="on" onClick={handleSubmit}>Lưu</Button>
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </>
//     );
// };

// export default Zones;