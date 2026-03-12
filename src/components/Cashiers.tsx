import React from 'react';
import { 
  UserPlus, 
  User, 
  Mail, 
  Shield, 
  Edit2, 
  Trash2, 
  X, 
  Check,
  Loader2,
  Key
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Cashier {
  id: number;
  username: string;
  role: string;
}

export default function Cashiers() {
  const [cashiers, setCashiers] = React.useState<Cashier[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingCashier, setEditingCashier] = React.useState<Cashier | null>(null);
  const [formData, setFormData] = React.useState({
    username: '',
    password: ''
  });

  const fetchCashiers = async () => {
    try {
      const res = await fetch('/api/cashiers');
      const data = await res.json();
      setCashiers(data);
    } catch (err) {
      console.error('Failed to fetch cashiers');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchCashiers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingCashier ? `/api/cashiers/${editingCashier.id}` : '/api/cashiers';
    const method = editingCashier ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setIsModalOpen(false);
        setEditingCashier(null);
        setFormData({ username: '', password: '' });
        fetchCashiers();
      }
    } catch (err) {
      console.error('Failed to save cashier');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this cashier?')) return;
    try {
      const res = await fetch(`/api/cashiers/${id}`, { method: 'DELETE' });
      if (res.ok) fetchCashiers();
    } catch (err) {
      console.error('Failed to delete cashier');
    }
  };

  const openEditModal = (cashier: Cashier) => {
    setEditingCashier(cashier);
    setFormData({ username: cashier.username, password: '' });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-stone-900">Cashier Management</h1>
          <p className="text-stone-500">Register and manage your shop's cashiers</p>
        </div>
        <button 
          onClick={() => {
            setEditingCashier(null);
            setFormData({ username: '', password: '' });
            setIsModalOpen(true);
          }}
          className="bg-stone-900 text-white px-6 py-3 rounded-2xl font-semibold flex items-center justify-center shadow-lg shadow-stone-900/20 hover:bg-stone-800 transition-all"
        >
          <UserPlus size={20} className="mr-2" /> Register Cashier
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-12">
            <Loader2 className="animate-spin text-stone-400" />
          </div>
        ) : cashiers.length > 0 ? (
          cashiers.map((cashier) => (
            <motion.div 
              key={cashier.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-sm border border-stone-100 p-6 flex flex-col justify-between"
            >
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center text-stone-600">
                  <User size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-900">{cashier.username}</h3>
                  <span className="text-xs font-bold text-stone-400 uppercase tracking-widest flex items-center">
                    <Shield size={12} className="mr-1" /> {cashier.role}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => openEditModal(cashier)}
                  className="flex-1 bg-stone-50 hover:bg-stone-100 text-stone-600 px-4 py-2 rounded-xl font-semibold text-sm transition-all flex items-center justify-center"
                >
                  <Edit2 size={16} className="mr-2" /> Edit
                </button>
                <button 
                  onClick={() => handleDelete(cashier.id)}
                  className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-xl transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full bg-white rounded-3xl p-12 text-center text-stone-400 border border-dashed border-stone-200">
            No cashiers registered yet.
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div key="cashier-modal" className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-stone-100 flex items-center justify-between">
                <h2 className="text-2xl font-serif font-bold text-stone-900">
                  {editingCashier ? 'Edit Cashier' : 'Register Cashier'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-stone-400 hover:text-stone-900 transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700 ml-1">Username</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                      <input 
                        required
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({...formData, username: e.target.value})}
                        className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none transition-all"
                        placeholder="cashier_name"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700 ml-1">
                      {editingCashier ? 'New Password (leave blank to keep current)' : 'Password'}
                    </label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                      <input 
                        required={!editingCashier}
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    className="w-full py-4 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-2xl shadow-xl shadow-stone-900/20 transition-all flex items-center justify-center"
                  >
                    {editingCashier ? <Check size={20} className="mr-2" /> : <UserPlus size={20} className="mr-2" />}
                    {editingCashier ? 'Save Changes' : 'Register Cashier'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
