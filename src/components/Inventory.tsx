import React from 'react';
import { InventoryItem } from '../types';
import { 
  Search, 
  Filter, 
  Plus, 
  Edit2, 
  Trash2, 
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Loader2,
  DollarSign,
  Tag,
  Info,
  X,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Inventory() {
  const [items, setItems] = React.useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<InventoryItem | null>(null);
  const [hoveredItem, setHoveredItem] = React.useState<InventoryItem | null>(null);
  const [mousePos, setMousePos] = React.useState({ x: 0, y: 0 });
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 15;
  
  const [newItem, setNewItem] = React.useState({
    code: '',
    category: 'suit',
    size: '',
    price_rental: '',
    price_sale: ''
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/inventory');
      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error('Failed to fetch inventory');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newItem,
          price_rental: parseFloat(newItem.price_rental),
          price_sale: parseFloat(newItem.price_sale)
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add item');
      }

      setIsAddModalOpen(false);
      setNewItem({
        code: '',
        category: 'suit',
        size: '',
        price_rental: '',
        price_sale: ''
      });
      fetchItems();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/inventory/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingItem)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update item');
      }

      setIsEditModalOpen(false);
      setEditingItem(null);
      fetchItems();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
      const res = await fetch(`/api/inventory/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete item');
      }

      fetchItems();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.code.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter]);

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-stone-900">Inventory</h1>
          <p className="text-stone-500">Manage your collection of suits and dresses</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-stone-900 text-white px-6 py-3 rounded-2xl font-semibold flex items-center justify-center shadow-lg shadow-stone-900/20 hover:bg-stone-800 transition-all"
        >
          <Plus size={20} className="mr-2" /> Add New Item
        </button>
      </header>

      <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-4 md:p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
            <input
              type="text"
              placeholder="Search by code (e.g. B1, W1)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none transition-all"
            >
              <option value="all">All Categories</option>
              <option value="suit">Men's Suits</option>
              <option value="wedding_dress">Wedding Dresses</option>
              <option value="dress">Women's Dresses</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-stone-100">
                <th className="pb-4 font-serif text-stone-500 font-medium px-4">Code</th>
                <th className="pb-4 font-serif text-stone-500 font-medium px-4">Category</th>
                <th className="pb-4 font-serif text-stone-500 font-medium px-4">Size</th>
                <th className="pb-4 font-serif text-stone-500 font-medium px-4">Status</th>
                <th className="pb-4 font-serif text-stone-500 font-medium px-4">Rental Price</th>
                <th className="pb-4 font-serif text-stone-500 font-medium px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <Loader2 className="animate-spin mx-auto text-stone-400" />
                  </td>
                </tr>
              ) : paginatedItems.length > 0 ? (
                paginatedItems.map((item) => (
                  <tr 
                    key={item.id} 
                    className="group hover:bg-stone-50 transition-colors relative"
                    onMouseEnter={(e) => {
                      setHoveredItem(item);
                      setMousePos({ x: e.clientX, y: e.clientY });
                    }}
                    onMouseMove={(e) => {
                      setMousePos({ x: e.clientX, y: e.clientY });
                    }}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <td className="py-4 px-4 font-bold text-stone-900">{item.code}</td>
                    <td className="py-4 px-4 text-stone-600 capitalize">{item.category.replace('_', ' ')}</td>
                    <td className="py-4 px-4 text-stone-600">{item.size}</td>
                    <td className="py-4 px-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        item.status === 'available' ? 'bg-emerald-50 text-emerald-600' :
                        item.status === 'rented' ? 'bg-blue-50 text-blue-600' : 
                        item.status === 'maintenance' ? 'bg-amber-50 text-amber-600' : 'bg-stone-100 text-stone-400'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-medium text-stone-900">${item.price_rental}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => {
                            setEditingItem(item);
                            setIsEditModalOpen(true);
                          }}
                          className="p-2 text-stone-400 hover:text-stone-900 hover:bg-white rounded-lg transition-all"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-2 text-stone-400 hover:text-red-600 hover:bg-white rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-stone-400">No items found matching your criteria</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-8 flex items-center justify-between text-sm text-stone-500">
          <p>Showing {paginatedItems.length} of {filteredItems.length} results</p>
          <div className="flex items-center space-x-4">
            <span className="text-stone-400">Page {currentPage} of {totalPages || 1}</span>
            <div className="flex space-x-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || isLoading}
                className="p-2 border border-stone-200 rounded-xl hover:bg-stone-50 disabled:opacity-30 transition-all"
              >
                <ChevronLeft size={18} />
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || totalPages === 0 || isLoading}
                className="p-2 border border-stone-200 rounded-xl hover:bg-stone-50 disabled:opacity-30 transition-all"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isAddModalOpen && (
          <div key="add-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-stone-100 flex items-center justify-between">
                <h2 className="text-xl font-serif font-bold text-stone-900">Add New Inventory Item</h2>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 text-stone-400 hover:text-stone-900 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddItem} className="p-8 space-y-6">
                {error && (
                  <div className="p-4 bg-red-50 text-red-600 rounded-2xl flex items-center text-sm">
                    <AlertCircle size={18} className="mr-2 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700 ml-1">Item Code</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. B105"
                      value={newItem.code}
                      onChange={(e) => setNewItem({ ...newItem, code: e.target.value })}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700 ml-1">Category</label>
                    <select
                      value={newItem.category}
                      onChange={(e) => setNewItem({ ...newItem, category: e.target.value as any })}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none transition-all"
                    >
                      <option value="suit">Men's Suit</option>
                      <option value="wedding_dress">Wedding Dress</option>
                      <option value="dress">Women's Dress</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-stone-700 ml-1">Size</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. 42R, Medium, 38"
                    value={newItem.size}
                    onChange={(e) => setNewItem({ ...newItem, size: e.target.value })}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700 ml-1">Rental Price ($)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                      <input
                        required
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={newItem.price_rental}
                        onChange={(e) => setNewItem({ ...newItem, price_rental: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700 ml-1">Sale Price ($)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                      <input
                        required
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={newItem.price_sale}
                        onChange={(e) => setNewItem({ ...newItem, price_sale: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 py-4 bg-stone-100 hover:bg-stone-200 text-stone-900 font-bold rounded-2xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-4 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-2xl shadow-xl shadow-stone-900/20 transition-all disabled:opacity-50 flex items-center justify-center"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Add Item'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isEditModalOpen && editingItem && (
          <div key="edit-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-stone-100 flex items-center justify-between">
                <h2 className="text-xl font-serif font-bold text-stone-900">Edit Inventory Item</h2>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 text-stone-400 hover:text-stone-900 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleEditItem} className="p-8 space-y-6">
                {error && (
                  <div className="p-4 bg-red-50 text-red-600 rounded-2xl flex items-center text-sm">
                    <AlertCircle size={18} className="mr-2 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700 ml-1">Item Code</label>
                    <input
                      required
                      type="text"
                      value={editingItem.code}
                      onChange={(e) => setEditingItem({ ...editingItem, code: e.target.value })}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700 ml-1">Category</label>
                    <select
                      value={editingItem.category}
                      onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value as any })}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none transition-all"
                    >
                      <option value="suit">Men's Suit</option>
                      <option value="wedding_dress">Wedding Dress</option>
                      <option value="dress">Women's Dress</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700 ml-1">Size</label>
                    <input
                      required
                      type="text"
                      value={editingItem.size}
                      onChange={(e) => setEditingItem({ ...editingItem, size: e.target.value })}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700 ml-1">Status</label>
                    <select
                      value={editingItem.status}
                      onChange={(e) => setEditingItem({ ...editingItem, status: e.target.value as any })}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none transition-all"
                    >
                      <option value="available">Available</option>
                      <option value="rented">Rented</option>
                      <option value="sold">Sold</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700 ml-1">Rental Price ($)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                      <input
                        required
                        type="number"
                        step="0.01"
                        value={editingItem.price_rental}
                        onChange={(e) => setEditingItem({ ...editingItem, price_rental: parseFloat(e.target.value) })}
                        className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700 ml-1">Sale Price ($)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                      <input
                        required
                        type="number"
                        step="0.01"
                        value={editingItem.price_sale}
                        onChange={(e) => setEditingItem({ ...editingItem, price_sale: parseFloat(e.target.value) })}
                        className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 py-4 bg-stone-100 hover:bg-stone-200 text-stone-900 font-bold rounded-2xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-4 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-2xl shadow-xl shadow-stone-900/20 transition-all disabled:opacity-50 flex items-center justify-center"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {hoveredItem && (
          <motion.div
            key="hover-details"
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            style={{ 
              position: 'fixed',
              left: mousePos.x + 20,
              top: mousePos.y - 40,
              zIndex: 100,
              pointerEvents: 'none'
            }}
            className="bg-stone-900 text-white p-5 rounded-2xl shadow-2xl border border-stone-800 w-64 backdrop-blur-md bg-opacity-95"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-widest text-stone-400">Item Details</span>
              <div className={`w-2 h-2 rounded-full ${
                hoveredItem.status === 'available' ? 'bg-emerald-400' :
                hoveredItem.status === 'rented' ? 'bg-blue-400' : 
                hoveredItem.status === 'maintenance' ? 'bg-amber-400' : 'bg-stone-500'
              }`} />
            </div>
            
            <h4 className="text-xl font-serif font-bold mb-1">{hoveredItem.code}</h4>
            <p className="text-sm text-stone-300 capitalize mb-4">{hoveredItem.category.replace('_', ' ')} • Size {hoveredItem.size}</p>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center text-stone-400">
                  <DollarSign size={14} className="mr-1" />
                  <span>Rental Price</span>
                </div>
                <span className="font-bold text-emerald-400">${hoveredItem.price_rental}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center text-stone-400">
                  <Tag size={14} className="mr-1" />
                  <span>Sale Price</span>
                </div>
                <span className="font-bold text-blue-400">${hoveredItem.price_sale}</span>
              </div>

              <div className="pt-3 border-t border-stone-800 mt-3">
                <div className="flex items-center text-[10px] text-stone-500 uppercase tracking-tighter">
                  <Info size={10} className="mr-1" />
                  <span>Status: {hoveredItem.status}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
