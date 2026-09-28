import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  PackageCheck, AlertTriangle, XCircle, Search, 
  Plus, Minus, RefreshCw, Loader2, ArrowUpRight, CheckCircle2 
} from 'lucide-react';

export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('All'); // 'All', 'LowStock', 'OutOfStock'
  const [updatingId, setUpdatingId] = useState(null);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error('Inventory fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();

    // Realtime Sync for Inventory
    const channel = supabase
      .channel('inventory-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => {
        fetchInventory();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleStockUpdate = async (id, currentStock, delta) => {
    const newStock = Math.max(0, currentStock + delta);
    setUpdatingId(id);

    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ 
          stock_quantity: newStock,
          is_available: newStock > 0 
        })
        .eq('id', id);

      if (error) throw error;
      setItems(prev => prev.map(item => item.id === id ? { ...item, stock_quantity: newStock, is_available: newStock > 0 } : item));
    } catch (err) {
      alert('Failed to update stock: ' + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDirectRestock = async (id, amount) => {
    const qty = prompt(`Enter quantity to add to stock:`, `${amount}`);
    const parsed = parseInt(qty, 10);
    if (isNaN(parsed) || parsed <= 0) return;

    setUpdatingId(id);
    try {
      const current = items.find(i => i.id === id)?.stock_quantity || 0;
      const { error } = await supabase
        .from('menu_items')
        .update({ 
          stock_quantity: current + parsed,
          is_available: true 
        })
        .eq('id', id);

      if (error) throw error;
      fetchInventory();
    } catch (err) {
      alert('Restock failed: ' + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  // Metrics
  const totalStockItems = items.length;
  const outOfStockItems = items.filter(i => (i.stock_quantity || 0) <= 0);
  const lowStockItems = items.filter(i => (i.stock_quantity || 0) > 0 && (i.stock_quantity || 0) <= (i.low_stock_threshold || 10));

  const filteredItems = items.filter(item => {
    const stock = item.stock_quantity || 0;
    const threshold = item.low_stock_threshold || 10;

    if (filter === 'LowStock' && (stock <= 0 || stock > threshold)) return false;
    if (filter === 'OutOfStock' && stock > 0) return false;

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return item.name?.toLowerCase().includes(q) || item.category?.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-neutral-900 tracking-tight">VIP Stock & Inventory</h2>
            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-200">
              AUTO-DEDUCT LIVE
            </span>
          </div>
          <p className="text-xs font-medium text-neutral-500 mt-0.5">Automated kitchen ingredient deduction and low-stock telemetry.</p>
        </div>

        <button
          onClick={fetchInventory}
          className="flex items-center gap-2 bg-white border border-neutral-200/90 hover:bg-neutral-50 text-neutral-700 px-4 py-2.5 rounded-2xl text-xs font-bold shadow-2xs transition cursor-pointer w-fit"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-500' : ''}`} />
          <span>Refresh Stock</span>
        </button>
      </div>

      {/* KPI Alert Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-3xl border border-neutral-100 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Total Menu Items</span>
            <h3 className="text-2xl font-black text-neutral-900 mt-1">{totalStockItems}</h3>
            <p className="text-[11px] font-semibold text-emerald-600 mt-1">Tracked ingredients</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0">
            <PackageCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-neutral-100 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Low Stock Warning</span>
            <h3 className="text-2xl font-black text-amber-600 mt-1">{lowStockItems.length}</h3>
            <p className="text-[11px] font-semibold text-amber-600 mt-1">Below threshold level</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-neutral-100 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Out of Stock</span>
            <h3 className="text-2xl font-black text-rose-600 mt-1">{outOfStockItems.length}</h3>
            <p className="text-[11px] font-semibold text-rose-600 mt-1">Auto-disabled on POS</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <XCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-2">
          {[
            { id: 'All', label: 'All Items', count: items.length },
            { id: 'LowStock', label: 'Low Stock', count: lowStockItems.length },
            { id: 'OutOfStock', label: 'Depleted', count: outOfStockItems.length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                filter === tab.id
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'bg-white text-neutral-600 border border-neutral-200/80 shadow-2xs'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${filter === tab.id ? 'bg-white/30 text-white' : 'bg-neutral-100 text-neutral-700'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search ingredient or item..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-neutral-200 rounded-2xl pl-10 pr-4 py-2 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-orange-500 shadow-2xs"
          />
        </div>
      </div>

      {/* Inventory Table List */}
      {loading ? (
        <div className="flex justify-center items-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-neutral-100 shadow-2xs">
          <PackageCheck className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-neutral-800">No matching inventory items</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-neutral-100 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50/50 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Item Name</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-center">Remaining Stock</th>
                  <th className="py-3.5 px-6 text-right">Quick Restock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredItems.map(item => {
                  const stock = item.stock_quantity || 0;
                  const threshold = item.low_stock_threshold || 10;
                  const isOut = stock <= 0;
                  const isLow = stock > 0 && stock <= threshold;

                  return (
                    <tr key={item.id} className="hover:bg-neutral-50/60 transition">
                      <td className="py-4 px-6">
                        <div className="font-extrabold text-neutral-900">{item.name}</div>
                        <span className="text-[10px] text-neutral-400 font-mono">Rs. {Number(item.price).toFixed(2)}</span>
                      </td>

                      <td className="py-4 px-4 font-bold text-neutral-600">
                        {item.category || 'General'}
                      </td>

                      <td className="py-4 px-4">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                            Depleted
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            Low Stock (≤{threshold})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Healthy
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-center font-mono">
                        <span className={`text-sm font-black ${isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-neutral-900'}`}>
                          {stock}
                        </span>
                        <span className="text-[10px] text-neutral-400 block font-sans font-medium">{item.unit || 'portions'}</span>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center gap-2">
                          <div className="flex items-center border border-neutral-200 rounded-xl bg-neutral-50 px-1.5 py-0.5">
                            <button
                              disabled={updatingId === item.id || stock <= 0}
                              onClick={() => handleStockUpdate(item.id, stock, -1)}
                              className="p-1 hover:text-black text-neutral-500 disabled:opacity-30 cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-6 text-center font-mono font-bold text-xs">{stock}</span>
                            <button
                              disabled={updatingId === item.id}
                              onClick={() => handleStockUpdate(item.id, stock, 1)}
                              className="p-1 hover:text-black text-neutral-500 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <button
                            onClick={() => handleDirectRestock(item.id, 25)}
                            className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-[11px] px-3 py-1.5 rounded-xl transition cursor-pointer shadow-xs"
                          >
                            + Restock
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}