import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  BarChart2, TrendingUp, DollarSign, ShoppingBag, 
  CheckCircle, Loader2, Calendar, RefreshCw, PieChart, Layers 
} from 'lucide-react';

export default function AnalyticsPage() {
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
    try {
      // Fetch all orders
      const { data: orders, error: ordersErr } = await supabase
        .from('orders')
        .select('total_amount, status, created_at');

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

      // Fetch menu items category breakdown
      const { data: itemsData, error: itemsErr } = await supabase
        .from('order_items')
        .select(`
          quantity,
          subtotal,
          menu_items (category)
        `);

      if (!itemsErr && itemsData) {
        const catMap = {};
        itemsData.forEach(row => {
          const cat = row.menu_items?.category || 'General';
          if (!catMap[cat]) {
            catMap[cat] = { category: cat, totalQty: 0, totalRev: 0 };
          }
          catMap[cat].totalQty += row.quantity || 0;
          catMap[cat].totalRev += Number(row.subtotal) || 0;
        });

        setCategorySales(Object.values(catMap));
      }

    } catch (err) {
      console.error('Deep Analytics Error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDeepAnalytics();

    const channel = supabase
      .channel('deep-analytics-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchDeepAnalytics();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDeepAnalytics();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-9 h-9 animate-spin text-orange-500" />
        <p className="text-xs font-semibold text-neutral-400">Compiling Financial Analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-neutral-900 tracking-tight">Business Intelligence & Reports</h2>
            <span className="bg-orange-50 text-orange-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-orange-200">
              PRO ANALYTICS
            </span>
          </div>
          <p className="text-xs font-medium text-neutral-500 mt-0.5">Comprehensive financial summary, category performance, and sales breakdown.</p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 bg-white border border-neutral-200/90 hover:bg-neutral-50 text-neutral-700 px-4 py-2.5 rounded-2xl text-xs font-bold shadow-2xs transition cursor-pointer w-fit"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-orange-500' : ''}`} />
          <span>Refresh Reports</span>
        </button>
      </div>

      {/* Detailed Financial Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-bold uppercase tracking-wider">Gross Revenue</span>
            <DollarSign className="w-5 h-5 text-emerald-500" />
          </div>
          <h3 className="text-3xl font-black text-neutral-900 font-mono">
            Rs. {metrics.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Lifetime POS Earnings</span>
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-bold uppercase tracking-wider">Average Basket Size</span>
            <BarChart2 className="w-5 h-5 text-orange-500" />
          </div>
          <h3 className="text-3xl font-black text-neutral-900 font-mono">
            Rs. {metrics.avgBasketSize.toFixed(2)}
          </h3>
          <p className="text-[11px] font-semibold text-neutral-400">
            Per transaction average ticket value
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-bold uppercase tracking-wider">Order Conversion</span>
            <CheckCircle className="w-5 h-5 text-blue-500" />
          </div>
          <h3 className="text-3xl font-black text-neutral-900">
            {metrics.completedOrders} <span className="text-sm font-normal text-neutral-400">/ {metrics.totalTransactions}</span>
          </h3>
          <p className="text-[11px] font-semibold text-blue-600">
            {metrics.totalTransactions > 0 ? ((metrics.completedOrders / metrics.totalTransactions) * 100).toFixed(0) : 0}% successful delivery rate
          </p>
        </div>
      </div>

      {/* Category Performance Breakdown */}
      <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-extrabold text-neutral-900">Menu Category Performance Breakdown</h3>
          </div>
          <span className="text-[10px] font-bold text-neutral-400">Revenue & Volume</span>
        </div>

        {categorySales.length === 0 ? (
          <p className="text-xs text-neutral-400 text-center py-10 font-medium">No category sales metrics available yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categorySales.map((cat) => (
              <div key={cat.category} className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-neutral-800">{cat.category}</span>
                  <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                    {cat.totalQty} units
                  </span>
                </div>
                <div className="flex items-baseline justify-between pt-2 border-t border-neutral-200/60">
                  <span className="text-[10px] text-neutral-400 font-semibold uppercase">Category Sales</span>
                  <span className="text-sm font-black font-mono text-neutral-900">Rs. {cat.totalRev}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}