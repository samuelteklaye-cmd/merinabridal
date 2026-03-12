import React from 'react';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Download,
  Calendar,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Loader2,
  Database
} from 'lucide-react';
import { motion } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { backupService } from '../services/BackupService';

export default function Reports() {
  const [inventoryUsage, setInventoryUsage] = React.useState<any[]>([]);
  const [dailyData, setDailyData] = React.useState<any>({ sales: [], rentals: [], returns: [] });
  const [cashierPerformance, setCashierPerformance] = React.useState<any[]>([]);
  const [stats, setStats] = React.useState<any>(null);
  const [selectedDate, setSelectedDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isExporting, setIsExporting] = React.useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [usageRes, dailyRes, performanceRes, statsRes] = await Promise.all([
        fetch('/api/reports/inventory-usage'),
        fetch(`/api/reports/daily?date=${selectedDate}`),
        fetch('/api/reports/cashier-performance'),
        fetch('/api/reports/dashboard')
      ]);
      
      const [usage, daily, performance, statsData] = await Promise.all([
        usageRes.json(),
        dailyRes.json(),
        performanceRes.json(),
        statsRes.json()
      ]);

      setInventoryUsage(usage);
      setDailyData(daily);
      setCashierPerformance(performance);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to fetch report data');
    } finally {
      setIsLoading(false);
    }
  };

  const exportToPDF = () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const title = `Daily Report - ${selectedDate}`;
      
      doc.setFontSize(20);
      doc.setTextColor(40);
      doc.text(title, 14, 22);
      
      doc.setFontSize(12);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

      // Financial Summary
      doc.setFontSize(14);
      doc.text('Financial Summary', 14, 45);
      autoTable(doc, {
        startY: 50,
        head: [['Metric', 'Amount']],
        body: [
          ['Total Revenue', `$${stats?.revenue.toLocaleString() || 0}`],
          ['Total Paid', `$${stats?.totalPaid.toLocaleString() || 0}`],
          ['Total Due', `$${stats?.totalDue.toLocaleString() || 0}`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] }
      });

      // Daily Sales
      let finalY = (doc as any).lastAutoTable.finalY + 15;
      doc.text('Daily Sales', 14, finalY);
      autoTable(doc, {
        startY: finalY + 5,
        head: [['Item Code', 'Cashier', 'Amount']],
        body: dailyData.sales.map((s: any) => [s.item_code, s.cashier || 'System', `$${s.amount}`]),
        theme: 'grid'
      });

      // Daily Rentals
      finalY = (doc as any).lastAutoTable.finalY + 15;
      doc.text('Daily Rentals', 14, finalY);
      autoTable(doc, {
        startY: finalY + 5,
        head: [['Item Code', 'Cashier', 'Paid Amount']],
        body: dailyData.rentals.map((r: any) => [r.item_code, r.cashier || 'System', `$${r.paid_amount}`]),
        theme: 'grid'
      });

      // Daily Returns
      finalY = (doc as any).lastAutoTable.finalY + 15;
      doc.text('Daily Returns', 14, finalY);
      autoTable(doc, {
        startY: finalY + 5,
        head: [['Item Code', 'Penalty', 'Status']],
        body: dailyData.returns.map((r: any) => [r.item_code, `$${r.penalty_amount}`, 'Returned']),
        theme: 'grid'
      });

      // Cashier Summary
      const cashierStats: Record<string, any> = {};
      dailyData.sales.forEach((s: any) => {
        const name = s.cashier || 'System';
        if (!cashierStats[name]) cashierStats[name] = { in: 0, due: 0, count: 0 };
        cashierStats[name].in += s.amount;
        cashierStats[name].count += 1;
      });
      dailyData.rentals.forEach((r: any) => {
        const name = r.cashier || 'System';
        if (!cashierStats[name]) cashierStats[name] = { in: 0, due: 0, count: 0 };
        cashierStats[name].in += r.paid_amount;
        cashierStats[name].due += (r.total_amount - r.paid_amount);
        cashierStats[name].count += 1;
      });
      dailyData.returns.forEach((r: any) => {
        const name = r.cashier || 'System';
        if (!cashierStats[name]) cashierStats[name] = { in: 0, due: 0, count: 0 };
        cashierStats[name].in += r.penalty_amount;
        cashierStats[name].count += 1;
      });

      finalY = (doc as any).lastAutoTable.finalY + 15;
      doc.text('Cashier Transaction Summary', 14, finalY);
      autoTable(doc, {
        startY: finalY + 5,
        head: [['Cashier', 'Ops', 'In (Payments)', 'Total Due', 'Net Revenue']],
        body: Object.keys(cashierStats).map(name => [
          name,
          cashierStats[name].count,
          `$${cashierStats[name].in.toLocaleString()}`,
          `$${cashierStats[name].due.toLocaleString()}`,
          `$${cashierStats[name].in.toLocaleString()}`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [44, 62, 80] }
      });

      doc.save(`Daily_Report_${selectedDate}.pdf`);
    } catch (err) {
      console.error('PDF Export failed', err);
    } finally {
      setIsExporting(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, [selectedDate]);

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-stone-900">Reports & Analytics</h1>
          <p className="text-stone-500">Track daily operations, revenue, and cashier performance</p>
        </div>
        <div className="flex items-center gap-4">
          <input 
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-white border border-stone-200 px-4 py-3 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-stone-900 outline-none transition-all"
          />
          <button 
            onClick={() => backupService.downloadBackup()}
            className="bg-white border border-stone-200 text-stone-600 px-6 py-3 rounded-2xl font-semibold flex items-center justify-center hover:bg-stone-50 transition-all"
            title="Download JSON data backup"
          >
            <Database size={20} className="mr-2" /> Backup Data
          </button>
          <button 
            onClick={exportToPDF}
            disabled={isExporting || isLoading}
            className="bg-stone-900 text-white px-6 py-3 rounded-2xl font-semibold flex items-center justify-center hover:bg-stone-800 transition-all disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="animate-spin mr-2" size={20} /> : <FileText size={20} className="mr-2" />}
            Export PDF
          </button>
        </div>
      </header>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-emerald-50 rounded-3xl p-6 border border-emerald-100">
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">Total Revenue</p>
          <p className="text-3xl font-bold text-emerald-900">${stats?.revenue.toLocaleString() || 0}</p>
        </div>
        <div className="bg-blue-50 rounded-3xl p-6 border border-blue-100">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">Total Paid</p>
          <p className="text-3xl font-bold text-blue-900">${stats?.totalPaid.toLocaleString() || 0}</p>
        </div>
        <div className="bg-amber-50 rounded-3xl p-6 border border-amber-100">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-1">Total Due</p>
          <p className="text-3xl font-bold text-amber-900">${stats?.totalDue.toLocaleString() || 0}</p>
        </div>
      </div>

      {/* Daily Operations Summary */}
      <div className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden">
        <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
          <h2 className="text-xl font-bold text-stone-900">Detailed Daily Transaction Report</h2>
          <div className="flex items-center text-sm text-stone-500">
            <Calendar size={16} className="mr-2" />
            {new Date(selectedDate).toLocaleDateString(undefined, { dateStyle: 'long' })}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 text-stone-500 text-xs uppercase tracking-widest font-bold">
                <th className="py-4 px-6">Cashier</th>
                <th className="py-4 px-6">Transactions</th>
                <th className="py-4 px-6 text-right">In (Payments)</th>
                <th className="py-4 px-6 text-right">Out (Refunds)</th>
                <th className="py-4 px-6 text-right">Total Due</th>
                <th className="py-4 px-6 text-right">Net Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {(() => {
                const cashierStats: Record<string, any> = {};
                
                // Process Sales
                dailyData.sales.forEach((s: any) => {
                  const name = s.cashier || 'System';
                  if (!cashierStats[name]) cashierStats[name] = { in: 0, out: 0, due: 0, count: 0 };
                  cashierStats[name].in += s.amount;
                  cashierStats[name].count += 1;
                });

                // Process Rentals
                dailyData.rentals.forEach((r: any) => {
                  const name = r.cashier || 'System';
                  if (!cashierStats[name]) cashierStats[name] = { in: 0, out: 0, due: 0, count: 0 };
                  cashierStats[name].in += r.paid_amount;
                  cashierStats[name].due += (r.total_amount - r.paid_amount);
                  cashierStats[name].count += 1;
                });

                // Process Returns (Penalties)
                dailyData.returns.forEach((r: any) => {
                  const name = r.cashier || 'System';
                  if (!cashierStats[name]) cashierStats[name] = { in: 0, out: 0, due: 0, count: 0 };
                  cashierStats[name].in += r.penalty_amount;
                  cashierStats[name].count += 1;
                });

                const cashierNames = Object.keys(cashierStats);
                
                if (cashierNames.length === 0) {
                  return (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-stone-400 italic">
                        No transactions recorded for this date.
                      </td>
                    </tr>
                  );
                }

                return cashierNames.map(name => (
                  <tr key={name} className="hover:bg-stone-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-stone-100 rounded-full flex items-center justify-center mr-3 text-stone-600 font-bold text-xs">
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-stone-900">{name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-stone-600 font-medium">{cashierStats[name].count} operations</span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="text-emerald-600 font-bold">${cashierStats[name].in.toLocaleString()}</span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="text-stone-400 font-medium">$0</span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="text-amber-600 font-bold">${cashierStats[name].due.toLocaleString()}</span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="bg-stone-900 text-white px-3 py-1 rounded-lg text-sm font-bold">
                        ${cashierStats[name].in.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
            {Object.keys(dailyData.sales).length + Object.keys(dailyData.rentals).length > 0 && (
              <tfoot className="bg-stone-50/50">
                <tr className="font-bold text-stone-900">
                  <td colSpan={2} className="py-4 px-6 text-right uppercase tracking-widest text-xs text-stone-400">Daily Totals</td>
                  <td className="py-4 px-6 text-right text-emerald-600">
                    ${(dailyData.sales.reduce((a: any, b: any) => a + b.amount, 0) + 
                       dailyData.rentals.reduce((a: any, b: any) => a + b.paid_amount, 0) +
                       dailyData.returns.reduce((a: any, b: any) => a + b.penalty_amount, 0)).toLocaleString()}
                  </td>
                  <td className="py-4 px-6 text-right text-stone-400">$0</td>
                  <td className="py-4 px-6 text-right text-amber-600">
                    ${dailyData.rentals.reduce((a: any, b: any) => a + (b.total_amount - b.paid_amount), 0).toLocaleString()}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <span className="text-lg">
                      ${(dailyData.sales.reduce((a: any, b: any) => a + b.amount, 0) + 
                         dailyData.rentals.reduce((a: any, b: any) => a + b.paid_amount, 0) +
                         dailyData.returns.reduce((a: any, b: any) => a + b.penalty_amount, 0)).toLocaleString()}
                    </span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl p-6 border border-stone-100 shadow-sm">
          <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-4">Daily Sales</h3>
          <div className="space-y-4">
            {dailyData.sales.length > 0 ? dailyData.sales.map((s: any) => (
              <div key={s.id} className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-stone-900">{s.item_code}</p>
                  <p className="text-xs text-stone-500">By {s.cashier || 'System'}</p>
                </div>
                <span className="text-emerald-600 font-bold">${s.amount}</span>
              </div>
            )) : <p className="text-stone-400 text-sm italic">No sales today</p>}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-stone-100 shadow-sm">
          <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-4">Daily Rentals</h3>
          <div className="space-y-4">
            {dailyData.rentals.length > 0 ? dailyData.rentals.map((r: any) => (
              <div key={r.id} className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-stone-900">{r.item_code}</p>
                  <p className="text-xs text-stone-500">By {r.cashier || 'System'}</p>
                </div>
                <span className="text-blue-600 font-bold">${r.paid_amount}</span>
              </div>
            )) : <p className="text-stone-400 text-sm italic">No rentals today</p>}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-stone-100 shadow-sm">
          <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-4">Daily Returns</h3>
          <div className="space-y-4">
            {dailyData.returns.length > 0 ? dailyData.returns.map((r: any) => (
              <div key={r.id} className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-stone-900">{r.item_code}</p>
                  <p className="text-xs text-stone-500">Penalty: ${r.penalty_amount}</p>
                </div>
                <span className="text-stone-600 font-bold">Returned</span>
              </div>
            )) : <p className="text-stone-400 text-sm italic">No returns today</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cashier Performance */}
        <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-stone-900">Cashier Performance</h2>
            <TrendingUp className="text-stone-400" size={24} />
          </div>
          
          <div className="space-y-6">
            {cashierPerformance.map((c: any) => (
              <div key={c.user_id} className="p-4 bg-stone-50 rounded-2xl">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-stone-900">{c.username}</span>
                  <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Total: ${ (c.sales_amount || 0) + (c.rentals_amount || 0) }</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-stone-500">Sales</p>
                    <p className="font-bold text-stone-900">{c.sales_count} items (${c.sales_amount || 0})</p>
                  </div>
                  <div>
                    <p className="text-stone-500">Rentals</p>
                    <p className="font-bold text-stone-900">{c.rentals_count} items (${c.rentals_amount || 0})</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Inventory Status */}
        <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-stone-900">Inventory Status</h2>
            <PieChart className="text-stone-400" size={24} />
          </div>
          
          <div className="space-y-6">
            {inventoryUsage.map((stat) => (
              <div key={`${stat.category}-${stat.status}`} className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-stone-600 capitalize">{stat.category.replace('_', ' ')} - {stat.status}</span>
                  <span className="text-stone-900">{stat.count} items</span>
                </div>
                <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(stat.count / 50) * 100}%` }}
                    className={`h-full ${
                      stat.status === 'available' ? 'bg-emerald-500' : 
                      stat.status === 'rented' ? 'bg-blue-500' : 'bg-stone-400'
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
