import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, string>>({
    daily_penalty_rate: '10'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
      } else {
        setMessage({ type: 'error', text: 'Failed to save settings.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while saving.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-light text-stone-900 tracking-tight">System Settings</h1>
          <p className="text-stone-500 mt-2">Configure global application parameters</p>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-8 border border-stone-100 shadow-sm"
      >
        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-stone-900 font-medium pb-2 border-b border-stone-50">
              <SettingsIcon size={20} />
              <span>Rental Configuration</span>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-stone-700">
                Daily Penalty Rate ($)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">$</span>
                <input
                  type="number"
                  value={settings.daily_penalty_rate}
                  onChange={(e) => setSettings({ ...settings, daily_penalty_rate: e.target.value })}
                  className="w-full pl-8 pr-4 py-3 bg-stone-50 border border-stone-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900/5 transition-all"
                  placeholder="10"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <p className="text-xs text-stone-400 italic">
                This amount will be automatically added to the penalty for each day a rental is overdue.
              </p>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between">
            <AnimatePresence mode="wait">
              {message && (
                <motion.div
                  key={message.type}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={`flex items-center space-x-2 text-sm ${
                    message.type === 'success' ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{message.text}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-2 bg-stone-900 text-white px-8 py-3 rounded-xl hover:bg-stone-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save size={18} />
              )}
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </motion.div>

      <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100 flex items-start space-x-4">
        <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
          <AlertCircle size={20} />
        </div>
        <div>
          <h4 className="text-amber-900 font-bold text-sm">Automatic Calculations</h4>
          <p className="text-amber-800/70 text-sm mt-1">
            Penalties are recalculated every time the Rentals list is loaded. 
            Changing this rate will affect all currently overdue rentals immediately.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
