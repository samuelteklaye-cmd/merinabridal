import React from 'react';
import { Sale, InventoryItem } from '../types';
import { 
  ShoppingBag, 
  Plus, 
  Search, 
  User, 
  Calendar, 
  DollarSign,
  X,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Sales() {
  const [sales, setSales] = React.useState<Sale[]>([]);
  const [availableItems, setAvailableItems] = React.useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [historySearch, setHistorySearch] = React.useState('');

  const [formData, setFormData] = React.useState({
    item_id: '',
    customer_name: '',
    sale_date: new Date().toISOString().split('T')[0],
    amount: ''
  });

  React.useEffect(() => {
    fetchSales();
    fetchAvailableItems();
  }, []);

  const fetchSales = async () => {
    try {
      const res = await fetch('/api/sales');
      if (res.ok) {
        const data = await res.json();
        setSales(data);
      }
    } catch (err) {
      console.error('Failed to fetch sales');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableItems = async () => {
    const res = await fetch('/api/inventory');
    const data = await res.json();
    setAvailableItems(data.filter((i: InventoryItem) => i.status === 'available'));
  };

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchSales();
        fetchAvailableItems();
        setFormData({
          item_id: '',
          customer_name: '',
          sale_date: new Date().toISOString().split('T')[0],
          amount: ''
        });
      }
    } catch (err) {
      console.error('Failed to process sale');
    }
  };

  const historyResults = sales.filter(sale => 
    (sale as any).item_code.toLowerCase() === historySearch.toLowerCase().trim()
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-stone-900">Sales</h1>
          <p className="text-stone-500">Manage item sales and permanent removals</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-stone-900 text-white px-6 py-3 rounded-2xl font-semibold flex items-center justify-center shadow-lg shadow-stone-900/20 hover:bg-stone-800 transition-all"
        >
          <Plus size={20} className="mr-2" /> New Sale
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden">
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-stone-400" /></div>
            ) : sales.length > 0 ? (
              <div className="divide-y divide-stone-50">
                {sales.map((sale) => (
                  <motion.div 
                    key={sale.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-stone-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                        <CheckCircle2 size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-stone-900">{sale.customer_name}</h3>
                        <p className="text-sm text-stone-500">{(sale as any).item_code} • {(sale as any).item_category.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-xs text-stone-400 uppercase tracking-widest font-bold">Sale Date</p>
                        <p className="text-sm font-medium text-stone-900">{new Date(sale.sale_date).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right min-w-[100px]">
                        <p className="text-xs text-stone-400 uppercase tracking-widest font-bold">Amount</p>
                        <p className="text-lg font-bold text-stone-900">${sale.amount.toLocaleString()}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-6 text-stone-300">
                  <ShoppingBag size={40} />
                </div>
                <h2 className="text-xl font-bold text-stone-900 mb-2">No Sales Yet</h2>
                <p className="text-stone-500 max-w-md mx-auto">Track all items that have been sold and removed from the rental pool.</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-stone-900 text-white p-8 rounded-3xl shadow-xl">
            <h2 className="text-xl font-serif font-bold mb-4 flex items-center gap-2">
              <Search size={24} className="text-stone-400" /> Item History
            </h2>
            <p className="text-stone-400 text-sm mb-6">Search for a specific item code to see its purchase history.</p>
            
            <div className="space-y-4">
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Enter Item Code (e.g. B1)"
                  className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-2xl focus:ring-2 focus:ring-white outline-none transition-all text-white placeholder:text-stone-500"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                />
              </div>

              <AnimatePresence>
                {historySearch && (
                  <motion.div 
                    key="history-results"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="space-y-3"
                  >
                    {historyResults.length > 0 ? (
                      historyResults.map(sale => (
                        <div key={sale.id} className="bg-white/5 p-4 rounded-2xl border border-white/5 flex justify-between items-center">
                          <div>
                            <p className="font-bold text-white">{sale.customer_name}</p>
                            <p className="text-xs text-stone-400">Sold on {new Date(sale.sale_date).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-emerald-400">${sale.amount}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-stone-500 text-sm italic">
                        No history found for this code
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div key="process-sale-modal" className="fixed inset-0 z-[60] flex items-center justify-center p-4">
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
              className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-stone-100 flex items-center justify-between">
                <h2 className="text-2xl font-serif font-bold text-stone-900">Process Sale</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-stone-400 hover:text-stone-900 transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleCreateSale} className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700 ml-1">Select Item</label>
                    <select 
                      required
                      value={formData.item_id}
                      onChange={(e) => setFormData({...formData, item_id: e.target.value})}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none transition-all"
                    >
                      <option value="">Choose an item...</option>
                      {availableItems.map(item => (
                        <option key={item.id} value={item.id}>{item.code} - {item.category} (${item.price_sale})</option>
                      ))}
                    </select>
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
                    <label className="text-sm font-semibold text-stone-700 ml-1">Sale Amount ($)</label>
                    <input 
                      required
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
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
                    Complete Sale
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
