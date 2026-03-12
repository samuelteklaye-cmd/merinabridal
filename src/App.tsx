import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Rentals from './components/Rentals';
import Sales from './components/Sales';
import Reports from './components/Reports';
import Cashiers from './components/Cashiers';
import Settings from './components/Settings';
import AuditLogs from './components/AuditLogs';
import { User } from './types';
import { Loader2, CloudOff, Cloud, ShieldCheck } from 'lucide-react';
import { backupService } from './services/BackupService';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isOffline, setIsOffline] = React.useState(!navigator.onLine);
  const [lastBackup, setLastBackup] = React.useState<string | null>(null);

  React.useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Background Backup Logic
  React.useEffect(() => {
    if (!user) return;

    const runBackup = async () => {
      if (isOffline) return;
      
      try {
        const [invRes, rentRes, saleRes] = await Promise.all([
          fetch('/api/inventory'),
          fetch('/api/rentals'),
          fetch('/api/sales')
        ]);

        if (invRes.ok && rentRes.ok && saleRes.ok) {
          const [inventory, rentals, sales] = await Promise.all([
            invRes.json(),
            rentRes.json(),
            saleRes.json()
          ]);

          await backupService.saveBackup({ inventory, rentals, sales });
          setLastBackup(new Date().toLocaleTimeString());
          console.log('Automated backup completed at', new Date().toLocaleTimeString());
        }
      } catch (err) {
        console.error('Automated backup failed', err);
      }
    };

    // Initial backup after login
    runBackup();

    // Run backup every 5 minutes
    const interval = setInterval(runBackup, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, isOffline]);

  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch (err) {
        console.error('Auth check failed');
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-stone-400" size={40} />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="relative">
        <AnimatePresence>
          {isOffline && (
            <motion.div
              key="offline-banner"
              initial={{ y: -100 }}
              animate={{ y: 0 }}
              exit={{ y: -100 }}
              className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-white py-2 px-4 flex items-center justify-center gap-2 font-medium shadow-lg"
            >
              <CloudOff size={18} />
              <span>You are currently offline. Data is being backed up locally.</span>
            </motion.div>
          )}
          {!isOffline && lastBackup && (
            <motion.div
              key="backup-status"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="fixed bottom-6 right-6 z-[100] bg-emerald-900/90 backdrop-blur-md text-white py-3 px-5 rounded-2xl flex items-center gap-3 shadow-2xl border border-emerald-800"
            >
              <ShieldCheck size={20} className="text-emerald-400" />
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">Auto-Backup Active</p>
                <p className="text-[10px] opacity-70">Last synced: {lastBackup}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Layout user={user} setUser={setUser}>
        <Routes>
          <Route 
            path="/login" 
            element={!user ? <Login setUser={setUser} /> : <Navigate to="/" />} 
          />
          <Route 
            path="/" 
            element={user ? <Dashboard /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/inventory" 
            element={user && user.role === 'admin' ? <Inventory /> : <Navigate to="/" />} 
          />
          <Route 
            path="/rentals" 
            element={user ? <Rentals /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/sales" 
            element={user ? <Sales /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/reports" 
            element={user && user.role === 'admin' ? <Reports /> : <Navigate to="/" />} 
          />
          <Route 
            path="/cashiers" 
            element={user && user.role === 'admin' ? <Cashiers /> : <Navigate to="/" />} 
          />
          <Route 
            path="/settings" 
            element={user && user.role === 'admin' ? <Settings /> : <Navigate to="/" />} 
          />
          <Route 
            path="/audit-logs" 
            element={user && user.role === 'admin' ? <AuditLogs /> : <Navigate to="/" />} 
          />
        </Routes>
      </Layout>
    </div>
  </BrowserRouter>
  );
}
