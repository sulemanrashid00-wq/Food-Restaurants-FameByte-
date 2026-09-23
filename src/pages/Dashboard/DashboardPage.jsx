import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  DollarSign, ShoppingBag, CheckCircle, Clock, Loader2, 
  TrendingUp, ArrowUpRight, Award, Utensils, RefreshCw, BarChart3, Armchair 
} from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState({ 
    totalRevenue: 0, 
    totalOrders: 0, 
    servedOrders: 0, 
    pendingOrders: 0,
    averageOrderValue: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [topItems, setTopItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      // 1. Fetch Orders Analytics
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, customer_name, total_amount, status, created_at, tables(table_number)')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      const totalRevenue = orders?.reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0) || 0;
      const totalOrders = orders?.length || 0;
      const servedOrders = orders?.filter(o => o.status === 'Served').length || 0;
      const pendingOrders = orders?.filter(o => o.status === 'New' || o.status === 'Preparing').length || 0;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      setStats({
        totalRevenue,
        totalOrders,
        servedOrders,
        pendingOrders,
        averageOrderValue
      });

      setRecentOrders(orders?.slice(0, 5) || []);

      // 2. Fetch Top Selling Items Aggregation
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('quantity, subtotal, menu_items(name)');

      if (!itemsError && orderItems) {
        const itemMap = {};
        orderItems.forEach(item => {
          const name = item.menu_items?.name || 'Unknown Item';
          if (!itemMap[name]) {
            itemMap[name] = { name, count: 0, revenue: 0 };
          }
          itemMap[name].count += item.quantity || 0;
          itemMap[name].revenue += Number(item.subtotal) || 0;
        });

        const sortedTopItems = Object.values(itemMap)
          .sort((a, b) => b.count - a.count)
          .slice(0, 4);

        setTopItems(sortedTopItems);
      }

    } catch (err) {
      console.error('Dashboard Fetch Error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Live Realtime listener for Instant Dashboard Updates
    const channel = supabase
      .channel('dashboard-main-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-9 h-9 animate-spin text-orange-500" />
        <p className="text-xs font-semibold text-neutral-400">Loading Executive Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-neutral-900 tracking-tight">Executive Dashboard</h2>
            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-200">
              LIVE SYNC
            </span>
          </div>
          <p className="text-xs font-medium text-neutral-500 mt-0.5">Real-time financial performance and kitchen operations overview.</p>
        </div>

        <button
          onClick={handleManualRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 bg-white border border-neutral-200/90 hover:bg-neutral-50 text-neutral-700 px-4 py-2.5 rounded-2xl text-xs font-bold shadow-2xs transition cursor-pointer w-fit"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-orange-500' : ''}`} />
          <span>Sync Dashboard</span>
        </button>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-white p-5 rounded-3xl border border-neutral-100 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Total Revenue</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-neutral-900 font-mono mt-2">
            Rs. {stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <div className="flex items-center gap-1 mt-2 text-[11px] font-semibold text-emerald-600">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Avg Order: Rs. {stats.averageOrderValue.toFixed(0)}</span>
          </div>
        </div>

        {/* Total Volume */}
        <div className="bg-white p-5 rounded-3xl border border-neutral-100 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Total Orders</span>
            <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-neutral-900 mt-2">{stats.totalOrders}</h3>
          <div className="flex items-center gap-1 mt-2 text-[11px] font-semibold text-neutral-400">
            <span>Processed across terminal</span>
          </div>
        </div>

        {/* Completed Orders */}
        <div className="bg-white p-5 rounded-3xl border border-neutral-100 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Served & Closed</span>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-neutral-900 mt-2">{stats.servedOrders}</h3>
          <div className="flex items-center gap-1 mt-2 text-[11px] font-semibold text-blue-600">
            <span>{stats.totalOrders > 0 ? ((stats.servedOrders / stats.totalOrders) * 100).toFixed(0) : 0}% Completion Rate</span>
          </div>
        </div>

        {/* Pending Queue */}
        <div className="bg-white p-5 rounded-3xl border border-neutral-100 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Active Kitchen</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-amber-600 mt-2">{stats.pendingOrders}</h3>
          <div className="flex items-center gap-1 mt-2 text-[11px] font-semibold text-amber-600">
            <span>In preparation queue</span>
          </div>
        </div>
      </div>

      {/* Two Column Section: Top Selling Items & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Top Selling Items (1 Column) */}
        <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-orange-500" />
              <h3 className="text-sm font-extrabold text-neutral-900">Top Performing Items</h3>
            </div>
            <span className="text-[10px] font-bold text-neutral-400">By Qty</span>
          </div>

          {topItems.length === 0 ? (
            <p className="text-xs text-neutral-400 text-center py-8 font-medium">No sales items registered yet.</p>
          ) : (
            <div className="space-y-3">
              {topItems.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between bg-neutral-50 p-3 rounded-2xl border border-neutral-100">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-xl bg-orange-500 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                      #{index + 1}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-neutral-800 line-clamp-1">{item.name}</p>
                      <p className="text-[10px] text-neutral-400 font-semibold">{item.count} units sold</p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold font-mono text-neutral-900">
                    Rs. {item.revenue}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Recent Transactions Table (2 Columns) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-neutral-100 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-orange-500" />
              <h3 className="text-sm font-extrabold text-neutral-900">Recent POS Transactions</h3>
            </div>
            <span className="text-[10px] font-bold text-neutral-400">Latest 5 Orders</span>
          </div>

          {recentOrders.length === 0 ? (
            <p className="text-xs text-neutral-400 text-center py-8 font-medium">No recent transactions recorded.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-neutral-400 font-bold border-b border-neutral-100 text-[10px] uppercase tracking-wider">
                    <th className="pb-2.5">Customer</th>
                    <th className="pb-2.5">Table</th>
                    <th className="pb-2.5">Status</th>
                    <th className="pb-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {recentOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-neutral-50/50 transition">
                      <td className="py-3 font-bold text-neutral-800">{o.customer_name || 'Guest'}</td>
                      <td className="py-3 text-neutral-500 font-medium">
                        {o.tables?.table_number ? `Table ${o.tables.table_number}` : 'Takeaway'}
                      </td>
                      <td className="py-3">
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                          o.status === 'Served' ? 'bg-emerald-50 text-emerald-600' :
                          o.status === 'Preparing' ? 'bg-orange-50 text-orange-600' :
                          'bg-amber-50 text-amber-600'
                        }`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="py-3 text-right font-mono font-extrabold text-neutral-900">
                        Rs. {Number(o.total_amount || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}