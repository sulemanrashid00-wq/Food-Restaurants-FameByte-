import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  Users, Plus, Search, Loader2, X, Armchair, 
  Sparkles, Clock, AlertCircle, ChevronDown, Check
} from 'lucide-react';

const STATUS_FILTERS = ['All', 'Available', 'Occupied', 'Reserved'];
const STATUS_OPTIONS = ['Available', 'Occupied', 'Reserved'];

const DEFAULT_TABLE_IMAGES = [
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1578474846511-04ba529f0b88?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&q=80&w=800',
];

export default function TableManagementPage() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState('');
  const [seatingCapacity, setSeatingCapacity] = useState('4');
  const [status, setStatus] = useState('Available');
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchTables = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tables')
        .select('*')
        .order('table_number', { ascending: true });

      if (error) throw error;
      setTables(data || []);
    } catch (err) {
      console.error('Fetch tables error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const handleStatusChange = async (id, newStatus) => {
    try {
      const { error } = await supabase
        .from('tables')
        .update({ 
          status: newStatus, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', id);

      if (error) throw error;
      setTables(prev => prev.map(t => (t.id === id ? { ...t, status: newStatus } : t)));
    } catch (err) {
      console.error('Status update failed:', err.message);
    }
  };

  const handleCreateTable = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const parsedNum = parseInt(tableNumber, 10);
    const parsedCap = parseInt(seatingCapacity, 10);

    if (isNaN(parsedNum) || parsedNum <= 0) {
      setErrorMsg('Please enter a valid table number');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('tables').insert([{
        table_number: parsedNum,
        seating_capacity: parsedCap,
        status: status,
        image_url: imageUrl.trim() || null
      }]);

      if (error) throw error;

      setTableNumber('');
      setSeatingCapacity('4');
      setStatus('Available');
      setImageUrl('');
      setModalOpen(false);
      fetchTables();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create table. Number might already exist.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCapacity = tables.reduce((acc, t) => acc + (t.seating_capacity || 0), 0);
  const occupiedCovers = tables
    .filter(t => t.status === 'Occupied')
    .reduce((acc, t) => acc + (t.seating_capacity || 0), 0);
  const occupancyPct = totalCapacity > 0 ? Math.round((occupiedCovers / totalCapacity) * 100) : 0;

  const filteredTables = tables.filter(t => {
    if (selectedFilter !== 'All' && t.status !== selectedFilter) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return `table ${t.table_number}`.toLowerCase().includes(q) || `t${t.table_number}`.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header & Live Telemetry Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-neutral-900 tracking-tight">Floor & Seating</h2>
          <p className="text-xs font-medium text-neutral-500 mt-0.5">Real-time table occupancy, guest covers, and salon layout.</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 px-4 py-2 bg-white border border-neutral-200/90 rounded-2xl shadow-xs">
            <Users className="w-4 h-4 text-orange-500" />
            <span className="text-xs font-semibold text-neutral-500">Live Capacity:</span>
            <span className="text-xs font-mono font-bold text-neutral-900">
              {occupiedCovers} / {totalCapacity} Seats ({occupancyPct}%)
            </span>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-full text-xs font-bold shadow-md shadow-orange-500/25 transition cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Table</span>
          </button>
        </div>
      </div>

      {/* 2. Filter Pills & Fast Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_FILTERS.map((filt) => {
            const count = filt === 'All' ? tables.length : tables.filter(t => t.status === filt).length;
            const isActive = selectedFilter === filt;

            return (
              <button
                key={filt}
                onClick={() => setSelectedFilter(filt)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                  isActive
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                    : 'bg-white text-neutral-600 hover:bg-orange-50/50 border border-neutral-200/80 shadow-2xs'
                }`}
              >
                <span>{filt}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-white/25 text-white' : 'bg-neutral-100 text-neutral-700'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by table number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-neutral-200/90 rounded-full text-xs font-medium text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-400 shadow-2xs transition"
          />
        </div>
      </div>

      {/* 3. Luxury Photo Cards Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-28">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      ) : filteredTables.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-neutral-100 shadow-2xs">
          <Armchair className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-neutral-800">No tables found</p>
          <p className="text-xs text-neutral-400 mt-0.5">Add a new table to start managing floor seating.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredTables.map((t, idx) => {
            const isAvail = t.status === 'Available';
            const isOcc = t.status === 'Occupied';
            const displayImage = t.image_url || DEFAULT_TABLE_IMAGES[idx % DEFAULT_TABLE_IMAGES.length];

            return (
              <div
                key={t.id}
                className="bg-white rounded-3xl overflow-hidden border border-neutral-100/90 hover:border-orange-200/90 transition duration-300 flex flex-col justify-between shadow-2xs hover:shadow-xl hover:-translate-y-0.5"
              >
                {/* Visual Image Banner */}
                <div className="relative h-44 bg-neutral-100 overflow-hidden group">
                  <img
                    src={displayImage}
                    alt={`Table ${t.table_number}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

                  {/* Table Pill */}
                  <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-extrabold text-neutral-900 shadow-md flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                    <span>Table {t.table_number}</span>
                  </div>

                  {/* Status Badge */}
                  <div className="absolute top-3 right-3">
                    <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full border shadow-sm backdrop-blur-md flex items-center gap-1.5 ${
                      isAvail 
                        ? 'bg-emerald-500/95 text-white border-emerald-400/80' 
                        : isOcc 
                        ? 'bg-rose-500/95 text-white border-rose-400/80' 
                        : 'bg-sky-500/95 text-white border-sky-400/80'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full bg-white ${isOcc ? 'animate-ping' : ''}`} />
                      {t.status}
                    </span>
                  </div>

                  {/* Bottom Capacity Info */}
                  <div className="absolute bottom-3 left-3 text-white flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-bold tracking-tight">
                      <Users className="w-3.5 h-3.5 text-orange-400" />
                      <span>{t.seating_capacity} Seats</span>
                    </div>
                  </div>
                </div>

                {/* Card Content & Details */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div className="bg-neutral-50/80 rounded-2xl p-3 border border-neutral-100 mb-3">
                    {isAvail ? (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                          Ready for Guests
                        </span>
                        <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Sanitized</span>
                      </div>
                    ) : isOcc ? (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-rose-700 font-bold flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-rose-500" />
                          Currently Dining
                        </span>
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">Active</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-sky-700 font-bold flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-sky-500" />
                          Reserved Seating
                        </span>
                        <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md">Held</span>
                      </div>
                    )}
                  </div>

                  {/* Status Dropdown */}
                  <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-400">Change Status:</span>
                    <div className="relative">
                      <select
                        value={t.status}
                        onChange={(e) => handleStatusChange(t.id, e.target.value)}
                        className="text-xs appearance-none bg-neutral-50 hover:bg-neutral-100/80 border border-neutral-200/90 rounded-xl pl-3 pr-7 py-1.5 font-bold text-neutral-800 focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer shadow-2xs transition"
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-3 h-3 text-neutral-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Add Table Modal With Image URL Field */}
      {modalOpen && (
        <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-neutral-100 w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-neutral-900">Add Floor Table</h3>
                <p className="text-xs font-medium text-neutral-400">Configure new table into restaurant floor inventory.</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-neutral-400 hover:text-neutral-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mx-5 mt-4 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateTable} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Table Number *</label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 7"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Seating Capacity (Covers) *</label>
                <select
                  value={seatingCapacity}
                  onChange={(e) => setSeatingCapacity(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  <option value="2">2 Guests (Banquette)</option>
                  <option value="4">4 Guests (Standard Dining)</option>
                  <option value="6">6 Guests (Booth)</option>
                  <option value="8">8 Guests (Large Party)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Initial Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Table Photo URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <span className="text-[10px] text-neutral-400 mt-1 block">Leave empty to use automatic ambient interior image.</span>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-extrabold bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/25 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Table</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}