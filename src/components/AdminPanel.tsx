import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Shield, Users, Settings, Search, Filter, 
  CheckCircle2, XCircle, AlertCircle, Trash2, 
  ShieldAlert, ShieldCheck, UserCheck, UserMinus,
  RefreshCw, MoreVertical, LogOut, ChevronRight
} from 'lucide-react';
import { db, collection, onSnapshot, updateDoc, doc, deleteDoc } from '../firebase';
import { User } from '../types';
import { toast } from 'sonner';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose, currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'admin' | 'buyer'>('all');
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = currentUser.email === "azizbekbakirov39@gmail.com";

  useEffect(() => {
    if (!isOpen) return;

    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
      setUsers(usersData);
      setLoading(false);
    });

    return () => unsub();
  }, [isOpen]);

  const toggleAdminAccess = async (user: User) => {
    if (!isSuperAdmin) {
      toast.error("Faqat Super Admin bu amalni bajara oladi!");
      return;
    }

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        adminAccessEnabled: !user.adminAccessEnabled
      });
      toast.success(`${user.displayName} uchun admin ruxsati ${!user.adminAccessEnabled ? 'yoqildi' : 'o\'chirildi'}`);
    } catch (error) {
      toast.error("Xatolik yuz berdi!");
    }
  };

  const toggleRole = async (user: User) => {
    if (!isSuperAdmin) {
      toast.error("Faqat Super Admin bu amalni bajara oladi!");
      return;
    }

    const newRole = user.role === 'admin' ? 'buyer' : 'admin';
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        role: newRole,
        adminAccessEnabled: newRole === 'admin' ? true : false
      });
      toast.success(`${user.displayName} roli ${newRole} ga o'zgartirildi`);
    } catch (error) {
      toast.error("Xatolik yuz berdi!");
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          u.email?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = filter === 'all' || u.role === filter;
    return matchesSearch && matchesFilter;
  });

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] bg-bg-primary flex flex-col"
    >
      {/* Header */}
      <div className="p-6 border-b border-white/10 flex items-center justify-between bg-bg-primary/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-yellow-500/20 rounded-2xl flex items-center justify-center text-yellow-500">
            <Shield size={28} />
          </div>
          <div>
            <h1 className="text-xl font-black italic tracking-tighter uppercase">Admin Panel</h1>
            <p className="text-[10px] text-text-primary/40 font-bold uppercase tracking-widest">
              {isSuperAdmin ? 'Super Admin Boshqaruvi' : 'Admin Boshqaruvi'}
            </p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-text-primary/60 hover:bg-white/10 transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      {/* Stats & Filters */}
      <div className="p-6 space-y-6 overflow-y-auto flex-1 pb-24">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-white/5 rounded-3xl border border-white/10">
            <p className="text-[10px] text-text-primary/40 font-bold uppercase tracking-widest mb-1">Jami Foydalanuvchilar</p>
            <p className="text-2xl font-black italic">{users.length}</p>
          </div>
          <div className="p-4 bg-white/5 rounded-3xl border border-white/10">
            <p className="text-[10px] text-text-primary/40 font-bold uppercase tracking-widest mb-1">Adminlar</p>
            <p className="text-2xl font-black italic text-yellow-500">{users.filter(u => u.role === 'admin').length}</p>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-primary/30" size={20} />
            <input 
              type="text"
              placeholder="Qidirish (ism yoki email)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold outline-none focus:border-yellow-500/50 transition-all"
            />
          </div>
          
          <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/10">
            {(['all', 'admin', 'buyer'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  filter === f ? 'bg-white/10 text-white shadow-lg' : 'text-text-primary/40 hover:text-text-primary/60'
                }`}
              >
                {f === 'all' ? 'Barchasi' : f === 'admin' ? 'Adminlar' : 'Xaridorlar'}
              </button>
            ))}
          </div>
        </div>

        {/* User List */}
        <div className="space-y-3">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4 text-text-primary/20">
              <RefreshCw className="animate-spin-slow" size={48} />
              <p className="text-[10px] font-black uppercase tracking-widest">Yuklanmoqda...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4 text-text-primary/20">
              <AlertCircle size={48} />
              <p className="text-[10px] font-black uppercase tracking-widest">Foydalanuvchilar topilmadi</p>
            </div>
          ) : (
            filteredUsers.map((user) => (
              <motion.div
                layout
                key={user.uid}
                className="p-4 bg-white/5 rounded-3xl border border-white/10 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="relative">
                    <img 
                      src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=random`} 
                      alt={user.displayName || ''}
                      className="w-12 h-12 rounded-2xl object-cover border border-white/10"
                    />
                    {user.role === 'admin' && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center text-white border-2 border-bg-primary">
                        <Shield size={10} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black truncate">{user.displayName || 'Noma\'lum'}</h3>
                    <p className="text-[10px] text-text-primary/40 font-bold truncate uppercase tracking-tighter">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isSuperAdmin && user.email !== currentUser.email && (
                    <>
                      <button
                        onClick={() => toggleRole(user)}
                        title={user.role === 'admin' ? "Adminlikdan olish" : "Admin qilish"}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                          user.role === 'admin' 
                            ? 'bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30' 
                            : 'bg-white/5 text-text-primary/40 hover:bg-white/10 hover:text-text-primary'
                        }`}
                      >
                        {user.role === 'admin' ? <ShieldMinus size={20} /> : <ShieldPlus size={20} />}
                      </button>

                      {user.role === 'admin' && (
                        <button
                          onClick={() => toggleAdminAccess(user)}
                          title={user.adminAccessEnabled ? "Ruxsatni o'chirish" : "Ruxsat berish"}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                            user.adminAccessEnabled 
                              ? 'bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30' 
                              : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
                          }`}
                        >
                          {user.adminAccessEnabled ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
                        </button>
                      )}
                    </>
                  )}
                  
                  {user.email === currentUser.email && (
                    <div className="px-3 py-1 bg-white/10 rounded-lg text-[8px] font-black uppercase tracking-widest text-text-primary/40">
                      Siz
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Custom icons for role management
const ShieldPlus = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

const ShieldMinus = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

export default AdminPanel;
