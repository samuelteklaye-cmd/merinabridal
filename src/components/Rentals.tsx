import React from 'react';
import { Rental, InventoryItem } from '../types';
import { 
  Plus, 
  Search, 
  Calendar, 
  User, 
  Phone, 
  DollarSign, 
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Rentals() {
  const [rentals, setRentals] = React.useState<Rental[]>([]);
  const [availableItems, setAvailableItems] = React.useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = React.useState(false);
  const [selectedRental, setSelectedRental] = React.useState<Rental | null>(null);
  const [penaltyAmount, setPenaltyAmount] = React.useState('0');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [searchTerm, setSearchTerm] = React.useState('');

  // New Rental Form State
  const [formData, setFormData] = React.useState({
    item_id: '',
    customer_name: '',
    customer_phone: '',
    customer_id_number: '',
    start_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    total_amount: '',
    paid_amount: ''
  });

  const [itemSearch, setItemSearch] = React.useState('');
  const [showItemDropdown, setShowItemDropdown] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<InventoryItem | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const filteredItems = availableItems.filter(item => 
    item.code.toLowerCase().includes(itemSearch.toLowerCase()) ||
    item.category.toLowerCase().includes(itemSearch.toLowerCase()) ||
    item.size.toLowerCase().includes(itemSearch.toLowerCase())
  );

  const filteredRentals = rentals.filter(rental => {
    const matchesStatus = statusFilter === 'all' || rental.status === statusFilter;
    const matchesSearch = rental.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rental.item_code.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleSelectItem = (item: InventoryItem) => {
    setFormData({ ...formData, item_id: item.id.toString(), total_amount: item.price_rental.toString() });
    setSelectedItem(item);
    setItemSearch(item.code);
    setShowItemDropdown(false);
  };

  React.useEffect(() => {
    fetchRentals();
    fetchAvailableItems();

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowItemDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchRentals = async () => {
    const res = await fetch('/api/rentals');
    const data = await res.json();
    setRentals(data);
    setIsLoading(false);
  };

  const fetchAvailableItems = async () => {
    const res = await fetch('/api/inventory');
    const data = await res.json();
    setAvailableItems(data.filter((i: InventoryItem) => i.status === 'available'));
  };

  const handleCreateRental = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/rentals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchRentals();
        fetchAvailableItems();
        setFormData({
          item_id: '',
          customer_name: '',
          customer_phone: '',
          customer_id_number: '',
          start_date: new Date().toISOString().split('T')[0],
          expiry_date: '',
          total_amount: '',
          paid_amount: ''
        });
        setItemSearch('');
        setSelectedItem(null);
      }
    } catch (err) {
      console.error('Failed to create rental');
    }
  };

  const handleReturn = (rental: Rental) => {
    setSelectedRental(rental);
    setPenaltyAmount(rental.penalty_amount.toString());
    setIsReturnModalOpen(true);
  };

  const confirmReturn = async () => {
    if (!selectedRental) return;

    try {
      const res = await fetch(`/api/rentals/${selectedRental.id}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          return_date: new Date().toISOString().split('T')[0],
          penalty_amount: parseFloat(penaltyAmount) || 0
        })
      });
      if (res.ok) {
        setIsReturnModalOpen(false);
        setSelectedRental(null);
        fetchRentals();
        fetchAvailableItems();
      }
    } catch (err) {
      console.error('Failed to return item');
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-stone-900">Rentals</h1>
          <p className="text-stone-500">Track active rentals and process returns</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
            <input 
              type="text"
              placeholder="Search customer or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-2xl text-sm focus:ring-2 focus:ring-stone-900 outline-none transition-all"
            />
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto bg-white border border-stone-200 px-4 py-3 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-stone-900 outline-none transition-all"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="returned">Returned</option>
            <option value="overdue">Overdue</option>
          </select>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto bg-stone-900 text-white px-6 py-3 rounded-2xl font-semibold flex items-center justify-center shadow-lg shadow-stone-900/20 hover:bg-stone-800 transition-all whitespace-nowrap"
          >
            <Plus size={20} className="mr-2" /> New Rental
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-stone-400" /></div>
        ) : filteredRentals.length > 0 ? (
          filteredRentals.map((rental) => (
            <motion.div 
              key={rental.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-3xl shadow-sm border border-stone-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="flex items-start space-x-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  rental.status === 'active' ? 'bg-blue-50 text-blue-600' : 
                  rental.status === 'overdue' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                }`}>
                  {rental.status === 'active' ? <Clock size={24} /> : 
                   rental.status === 'overdue' ? <AlertTriangle size={24} /> : <CheckCircle2 size={24} />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-900">{rental.customer_name}</h3>
                  <p className="text-stone-500 font-medium">{rental.item_code} • {rental.item_category.replace('_', ' ')}</p>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-stone-400">
                    <span className="flex items-center"><Calendar size={14} className="mr-1" /> {new Date(rental.start_date).toLocaleDateString()}</span>
                    <span className={`flex items-center font-semibold ${rental.status === 'overdue' ? 'text-red-600' : 'text-stone-600'}`}>
                      <Clock size={14} className="mr-1" /> Due: {new Date(rental.expiry_date).toLocaleDateString()}
                    </span>
                    <span className="flex items-center"><Phone size={14} className="mr-1" /> {rental.customer_phone}</span>
                    <span className="flex items-center font-mono text-[10px] bg-stone-100 px-2 py-0.5 rounded-full uppercase tracking-tighter">ID: {rental.customer_id_number}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="text-right">
                  <p className="text-sm text-stone-400 uppercase tracking-wider font-medium">Payment Status</p>
                  <p className="text-lg font-bold text-stone-900">${rental.paid_amount} / ${rental.total_amount}</p>
                  {rental.penalty_amount > 0 && (
                    <p className="text-xs font-bold text-red-600">Penalty: ${rental.penalty_amount}</p>
                  )}
                </div>
                
                {rental.status === 'active' || rental.status === 'overdue' ? (
                  <button 
                    onClick={() => handleReturn(rental)}
                    className="w-full md:w-auto px-6 py-3 bg-stone-100 hover:bg-stone-200 text-stone-900 font-semibold rounded-xl transition-all"
                  >
                    Process Return
                  </button>
                ) : (
                  <div className="px-6 py-3 bg-emerald-50 text-emerald-600 font-semibold rounded-xl flex items-center">
                    <CheckCircle2 size={18} className="mr-2" /> Returned
                  </div>
                )}
              </div>
            </motion.div>
          ))
        ) : (
          <div className="bg-white rounded-3xl p-12 text-center text-stone-400 border border-dashed border-stone-200">
            No rentals found. Start by creating a new one.
          </div>
        )}
      </div>

      {/* New Rental Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div key="new-rental-modal" className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsModalOpen(false);
                setItemSearch('');
                setSelectedItem(null);
              }}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-stone-100 flex items-center justify-between">
                <h2 className="text-2xl font-serif font-bold text-stone-900">New Rental</h2>
                <button onClick={() => {
                  setIsModalOpen(false);
                  setItemSearch('');
                  setSelectedItem(null);
                }} className="p-2 text-stone-400 hover:text-stone-900 transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleCreateRental} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 relative" ref={dropdownRef}>
                    <label className="text-sm font-semibold text-stone-700 ml-1">Search Item (Code/Size)</label>
                    <div className="relative">
                      <input 
                        required
                        type="text"
                        value={itemSearch}
                        onChange={(e) => {
                          setItemSearch(e.target.value);
                          setShowItemDropdown(true);
                          if (selectedItem && e.target.value !== selectedItem.code) {
                            setSelectedItem(null);
                            setFormData({ ...formData, item_id: '' });
                          }
                        }}
                        onFocus={() => setShowItemDropdown(true)}
                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none transition-all pr-12"
                        placeholder="Search by code, category or size..."
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        {itemSearch && (
                          <button 
                            type="button"
                            onClick={() => {
                              setItemSearch('');
                              setSelectedItem(null);
                              setFormData({ ...formData, item_id: '' });
                            }}
                            className="text-stone-400 hover:text-stone-600 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        )}
                        <Search className="text-stone-400" size={18} />
                      </div>
                    </div>

                    <AnimatePresence>
                      {showItemDropdown && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute z-50 w-full mt-2 bg-white border border-stone-100 rounded-2xl shadow-xl max-h-60 overflow-y-auto"
                        >
                          {filteredItems.length > 0 ? (
                            filteredItems.map(item => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => handleSelectItem(item)}
                                className="w-full text-left px-4 py-3 hover:bg-stone-50 transition-colors border-b border-stone-50 last:border-0 flex justify-between items-center"
                              >
                                <div>
                                  <p className="font-bold text-stone-900">{item.code}</p>
                                  <p className="text-xs text-stone-500">{item.category.replace('_', ' ')} • Size {item.size}</p>
                                </div>
                                <span className="text-stone-400 text-xs font-mono">${item.price_rental}</span>
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-6 text-center text-stone-400 text-sm italic">
                              No matching items found
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Customer ID/Passport Info Card */}
                  <div className="md:row-span-2">
                    <label className="text-sm font-semibold text-stone-700 ml-1 mb-2 block">Customer Identity Verification</label>
                    <div className="bg-stone-50 border border-stone-200 rounded-3xl p-6 h-full flex flex-col justify-center space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">ID Card / Passport Number</label>
                        <input 
                          required
                          type="text"
                          value={formData.customer_id_number}
                          onChange={(e) => setFormData({...formData, customer_id_number: e.target.value})}
                          className="w-full px-4 py-3 bg-white border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none transition-all font-mono"
                          placeholder="Enter ID or Passport #"
                        />
                      </div>
                      
                      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                        <div className="flex items-start">
                          <AlertTriangle size={16} className="text-amber-600 mt-0.5 mr-2 shrink-0" />
                          <p className="text-[11px] text-amber-800 leading-relaxed">
                            Please verify the customer's physical ID card or passport before confirming the rental. Ensure the number matches the document provided.
                          </p>
                        </div>
                      </div>

                      {selectedItem && (
                        <div className="pt-4 border-t border-stone-100">
                          <p className="text-[10px] text-stone-400 uppercase tracking-widest mb-2 font-bold">Selected Item Info</p>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-stone-900">{selectedItem.code}</span>
                            <span className="text-xs bg-stone-200 px-2 py-0.5 rounded-full font-medium">{selectedItem.category.replace('_', ' ')}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700 ml-1">Customer Name</label>
                    <input 
                      required
                      type="text"
                      value={formData.customer_name}
                      onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none transition-all"
                      placeholder="Full Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700 ml-1">Phone Number</label>
                    <input 
                      required
                      type="tel"
                      value={formData.customer_phone}
                      onChange={(e) => setFormData({...formData, customer_phone: e.target.value})}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none transition-all"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700 ml-1">Due Date</label>
                    <input 
                      required
                      type="date"
                      value={formData.expiry_date}
                      onChange={(e) => setFormData({...formData, expiry_date: e.target.value})}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700 ml-1">Total Amount ($)</label>
                    <input 
                      required
                      type="number"
                      value={formData.total_amount}
                      onChange={(e) => setFormData({...formData, total_amount: e.target.value})}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none transition-all"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700 ml-1">Paid Amount ($)</label>
                    <input 
                      required
                      type="number"
                      value={formData.paid_amount}
                      onChange={(e) => setFormData({...formData, paid_amount: e.target.value})}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none transition-all"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    className="w-full py-4 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-2xl shadow-xl shadow-stone-900/20 transition-all"
                  >
                    Confirm Rental
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Return Confirmation Modal */}
      <AnimatePresence>
        {isReturnModalOpen && selectedRental && (
          <div key="return-modal" className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsReturnModalOpen(false)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-stone-100 flex items-center justify-between">
                <h2 className="text-xl font-serif font-bold text-stone-900">Confirm Return</h2>
                <button onClick={() => setIsReturnModalOpen(false)} className="p-2 text-stone-400 hover:text-stone-900 transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={32} />
                  </div>
                  <p className="text-stone-600">Are you sure you want to process the return for:</p>
                  <p className="text-lg font-bold text-stone-900">{selectedRental.customer_name}</p>
                  <p className="text-sm text-stone-500">{selectedRental.item_code} • {selectedRental.item_category.replace('_', ' ')}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-stone-700 ml-1">Penalty Amount ($)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                    <input 
                      type="number"
                      value={penaltyAmount}
                      onChange={(e) => setPenaltyAmount(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none transition-all"
                      placeholder="0.00"
                    />
                  </div>
                  {parseFloat(penaltyAmount) > 0 && (
                    <p className="text-xs text-red-600 font-medium ml-1 flex items-center">
                      <AlertTriangle size={12} className="mr-1" /> Penalty will be applied
                    </p>
                  )}
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setIsReturnModalOpen(false)}
                    className="flex-1 py-4 bg-stone-100 hover:bg-stone-200 text-stone-900 font-bold rounded-2xl transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={confirmReturn}
                    className="flex-1 py-4 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-2xl shadow-xl shadow-stone-900/20 transition-all"
                  >
                    Confirm Return
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
