import { useState, useEffect } from 'react';
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

  const fetchDeepAnalytics = async () => {
    setLoading(true);
    try {
      let query = supabase.from('orders').select('total_amount, status, created_at');

      // Date Range Filtering Logic
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

      const totalSales = orders?.reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0) || 0;
      const totalTransactions = orders?.length || 0;
      const completedOrders = orders?.filter(o => o.status === 'Served').length || 0;
      const cancelledOrders = orders?.filter(o => o.status === 'Cancelled').length || 0;
      const avgBasketSize = totalTransactions > 0 ? totalSales / totalTransactions : 0;

      setMetrics({
        totalSales,
        totalTransactions,
        completedOrders,
        cancelledOrders,
        avgBasketSize
      });

      // Category breakdown
      const { data: itemsData } = await supabase
        .from('order_items')
        .select(`
          quantity,
          subtotal,
          menu_items (category)
        `);

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
  };

  useEffect(() => {
    fetchDeepAnalytics();
  }, [dateRange]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Date Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-neutral-900 tracking-tight">Business Intelligence & Reports</h2>
          <p className="text-xs font-medium text-neutral-500 mt-0.5">Filter sales performance and revenue analytics by timeframe.</p>
        </div>

        {/* Date Filter Pills */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-neutral-200/80 shadow-2xs">
          {[
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'This Week' },
            { id: 'month', label: 'This Month' },
            { id: 'all', label: 'All Time' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setDateRange(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
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
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Gross Revenue</span>
            <h3 className="text-3xl font-black text-neutral-900 font-mono">Rs. {metrics.totalSales.toFixed(2)}</h3>
            <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Filtered Period Earnings
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-2xs space-y-2">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Total Orders</span>
            <h3 className="text-3xl font-black text-neutral-900">{metrics.totalTransactions}</h3>
            <p className="text-[11px] font-semibold text-neutral-400">Processed Transactions</p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-2xs space-y-2">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Average Order Ticket</span>
            <h3 className="text-3xl font-black text-neutral-900 font-mono">Rs. {metrics.avgBasketSize.toFixed(2)}</h3>
            <p className="text-[11px] font-semibold text-blue-600">Per Customer Spent</p>
          </div>
        </div>
      )}
    </div>
  );
}