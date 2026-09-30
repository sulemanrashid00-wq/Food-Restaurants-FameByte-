import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  BarChart2, TrendingUp, DollarSign, 
  CheckCircle, Loader2, Calendar, RefreshCw, Layers 
} from 'lucide-react';

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('all'); // 'today', 'week', 'month', 'all'
  const [metrics, setMetrics] = useState({
    totalSales: 0,
    totalTransactions: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    avgBasketSize: 0
  });
  const [categorySales, setCategorySales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDeepAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('orders').select('total_amount, status, created_at');

      const now = new Date();
      if (dateRange === 'today') {
        const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        query = query.gte('created_at', startOfDay);
      } else if (dateRange === 'week') {
        const startOfWeek = new Date(now.setDate(now.getDate() - 7)).toISOString();
        query = query.gte('created_at', startOfWeek);
      } else if (dateRange === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        query = query.gte('created_at', startOfMonth);
      }

      const { data: orders, error: ordersErr } = await query;
      if (ordersErr) throw ordersErr;

      // VIP FIX: Only 'Served' orders contribute to revenue and average basket size!
      const validServed = orders?.filter(o => o.status === 'Served') || [];
      const totalSales = validServed.reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0);
      const totalTransactions = orders?.length || 0;
      const completedOrders = validServed.length;
      const cancelledOrders = orders?.filter(o => o.status === 'Cancelled').length || 0;
      const avgBasketSize = completedOrders > 0 ? totalSales / completedOrders : 0;

      setMetrics({
        totalSales,
        totalTransactions,
        completedOrders,
        cancelledOrders,
        avgBasketSize
      });

      // Category breakdown (Excluding cancelled orders)
      const { data: itemsData } = await supabase
        .from('order_items')
        .select(`
          quantity,
          subtotal,
          menu_items (category),
          orders!inner(status)
        `)
        .neq('orders.status', 'Cancelled');

      if (itemsData) {
        const catMap = {};
        itemsData.forEach(row => {
          const cat = row.menu_items?.category || 'General';
          if (!catMap[cat]) catMap[cat] = { category: cat, totalQty: 0, totalRev: 0 };
          catMap[cat].totalQty += row.quantity || 0;
          catMap[cat].totalRev += Number(row.subtotal) || 0;
        });
        setCategorySales(Object.values(catMap));
      }

    } catch (err) {
      console.error('Analytics Error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchDeepAnalytics();
  }, [fetchDeepAnalytics]);

  return (
    <div className="space-y-6 pb-12 px-2 sm:px-0">
      {/* Header & Date Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-neutral-900 tracking-tight">Business Intelligence & Reports</h2>
          <p className="text-xs font-medium text-neutral-500 mt-0.5">Filter sales performance and revenue analytics by timeframe.</p>
        </div>

        {/* Date Filter Pills */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-neutral-200/80 shadow-2xs overflow-x-auto">
          {[
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'This Week' },
            { id: 'month', label: 'This Month' },
            { id: 'all', label: 'All Time' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setDateRange(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                dateRange === tab.id 
                  ? 'bg-orange-500 text-white shadow-xs' 
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Row */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-2xs space-y-2">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Gross Revenue (Served)</span>
            <h3 className="text-3xl font-black text-neutral-900 font-mono">Rs. {metrics.totalSales.toFixed(2)}</h3>
            <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Filtered Period Earnings
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-2xs space-y-2">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Total Orders</span>
            <h3 className="text-3xl font-black text-neutral-900">{metrics.totalTransactions}</h3>
            <p className="text-[11px] font-semibold text-neutral-400">Processed ({metrics.completedOrders} completed, {metrics.cancelledOrders} cancelled)</p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-2xs space-y-2">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Average Order Ticket</span>
            <h3 className="text-3xl font-black text-neutral-900 font-mono">Rs. {metrics.avgBasketSize.toFixed(2)}</h3>
            <p className="text-[11px] font-semibold text-blue-600">Per Completed Customer</p>
          </div>
        </div>
      )}

      {/* Category Breakdown Performance */}
      <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-extrabold text-neutral-900">Category Sales Breakdown</h3>
          </div>
          <span className="text-[10px] font-bold text-neutral-400">Performance Index</span>
        </div>

        {categorySales.length === 0 ? (
          <p className="text-xs text-neutral-400 text-center py-6">No category data available for this timeframe.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categorySales.map(cat => (
              <div key={cat.category} className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-extrabold text-neutral-800">{cat.category}</span>
                  <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                    {cat.totalQty} units
                  </span>
                </div>
                <p className="text-lg font-black font-mono text-neutral-900">Rs. {cat.totalRev.toFixed(2)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}