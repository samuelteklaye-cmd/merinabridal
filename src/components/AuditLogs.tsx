import React from 'react';
import { History, Search, Filter, Loader2, User as UserIcon, Clock } from 'lucide-react';
import { motion } from 'motion/react';

interface AuditLog {
  id: number;
  user_id: number;
  username: string;
  action: string;
  timestamp: string;
}

const AuditLogs: React.FC = () => {
  const [logs, setLogs] = React.useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/audit-logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => 
    log.username.toLowerCase().includes(search.toLowerCase()) ||
    log.action.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-stone-900">Audit Logs</h1>
          <p className="text-stone-500">Track all system activities and user actions</p>
        </div>
        <button 
          onClick={fetchLogs}
          className="bg-white border border-stone-200 text-stone-600 px-6 py-3 rounded-2xl font-semibold flex items-center justify-center hover:bg-stone-50 transition-all"
        >
          <Clock size={20} className="mr-2" /> Refresh Logs
        </button>
      </header>

      <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-6">
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
          <input
            type="text"
            placeholder="Search logs by user or action..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-stone-900 outline-none transition-all"
          />
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-stone-400" /></div>
          ) : filteredLogs.length > 0 ? (
            filteredLogs.map((log, idx) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-start space-x-4 p-4 rounded-2xl hover:bg-stone-50 transition-colors border border-transparent hover:border-stone-100"
              >
                <div className="w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center text-stone-500 shrink-0">
                  <UserIcon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-stone-900">{log.username}</span>
                    <span className="text-xs text-stone-400">{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-stone-600 text-sm leading-relaxed">{log.action}</p>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="p-12 text-center text-stone-400 italic">No logs found matching your search.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
