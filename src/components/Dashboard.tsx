import React from 'react';
import { DashboardStats, Rental } from '../types';
import { 
  Users, 
  AlertCircle, 
  DollarSign, 
  TrendingUp,
  Clock,
  ArrowRight,
  CheckCircle2,
  Calendar,
  ShoppingBag
} from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [recentRentals, setRecentRentals] = React.useState<Rental[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const navigate = useNavigate();

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, rentalsRes] = await Promise.all([
          fetch('/api/reports/dashboard'),
          fetch('/api/rentals')
        ]);
        const statsData = await statsRes.json();
        const rentalsData = await rentalsRes.json();
        setStats(statsData);
        setRecentRentals(rentalsData.slice(0, 5));
      } catch (err) {
        console.error('Failed to fetch dashboard data');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) return <div className="flex items-center justify-center h-64"><Clock className="animate-spin text-stone-400" /></div>;

  const cards = [
    { title: 'Active Rentals', value: stats?.activeRentals || 0, icon: Users, color: 'bg-blue-50 text-blue-600' },
    { title: 'Overdue Items', value: stats?.overdueRentals || 0, icon: AlertCircle, color: 'bg-red-50 text-red-600' },
    { title: 'Total Revenue', value: `$${stats?.revenue.toLocaleString() || 0}`, icon: DollarSign, color: 'bg-emerald-50 text-emerald-600' },
    { title: 'Total Due', value: `$${stats?.totalDue.toLocaleString() || 0}`, icon: TrendingUp, color: 'bg-amber-50 text-amber-600' },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-serif font-bold text-stone-900">Dashboard</h1>
        <p className="text-stone-500">Overview of your shop's performance</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, idx) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100"
          >
            <div className={`w-12 h-12 ${card.color} rounded-2xl flex items-center justify-center mb-4`}>
              <card.icon size={24} />
            </div>
            <p className="text-sm font-medium text-stone-500 uppercase tracking-wider">{card.title}</p>
            <p className="text-2xl font-bold text-stone-900 mt-1">{card.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden">
          <div className="p-6 border-b border-stone-100 flex items-center justify-between">
            <h2 className="text-xl font-bold text-stone-900">Recent Rentals</h2>
            <button 
              onClick={() => navigate('/rentals')}
              className="text-stone-500 hover:text-stone-900 text-sm font-medium flex items-center"
            >
              View All <ArrowRight size={16} className="ml-1" />
            </button>
          </div>
          <div className="divide-y divide-stone-50">
            {recentRentals.length > 0 ? (
              recentRentals.map((rental) => (
                <div key={rental.id} className="p-6 flex items-center justify-between hover:bg-stone-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center text-stone-600">
                      <Clock size={20} />
                    </div>
                    <div>
                      <p className="font-medium text-stone-900">{rental.customer_name}</p>
                      <p className="text-sm text-stone-500">{rental.item_code} • {rental.item_category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-stone-900">Due: {new Date(rental.expiry_date).toLocaleDateString()}</p>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
                      rental.status === 'active' ? 'bg-blue-50 text-blue-600' : 
                      rental.status === 'overdue' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      {rental.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-stone-400">No recent rentals found</div>
            )}
          </div>
        </div>

        <div className="bg-stone-900 rounded-3xl p-8 text-white shadow-xl">
          <h2 className="text-xl font-bold mb-6">Quick Actions</h2>
          <div className="space-y-4">
            <button 
              onClick={() => navigate('/rentals')}
              className="w-full bg-white/10 hover:bg-white/20 p-4 rounded-2xl flex items-center justify-between transition-colors group"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mr-4">
                  <Calendar size={20} />
                </div>
                <span className="font-medium">New Rental</span>
              </div>
              <ArrowRight size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <button 
              onClick={() => navigate('/sales')}
              className="w-full bg-white/10 hover:bg-white/20 p-4 rounded-2xl flex items-center justify-between transition-colors group"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mr-4">
                  <ShoppingBag size={20} />
                </div>
                <span className="font-medium">Process Sale</span>
              </div>
              <ArrowRight size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <button 
              onClick={() => navigate('/rentals')}
              className="w-full bg-white/10 hover:bg-white/20 p-4 rounded-2xl flex items-center justify-between transition-colors group"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mr-4">
                  <CheckCircle2 size={20} />
                </div>
                <span className="font-medium">Return Item</span>
              </div>
              <ArrowRight size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
          
          <div className="mt-12 p-6 bg-white/5 rounded-2xl border border-white/10">
            <p className="text-sm text-white/60 uppercase tracking-widest mb-2">System Status</p>
            <div className="flex items-center text-emerald-400 text-sm font-medium">
              <div className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse" />
              All systems operational
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
