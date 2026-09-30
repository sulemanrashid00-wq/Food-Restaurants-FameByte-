import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  Clock, CheckCircle, ChefHat, AlertTriangle, 
  Flame, RefreshCw, Loader2, Utensils, XCircle, 
  Volume2, VolumeX, Timer, BellRing
} from 'lucide-react';

export default function OrderListPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Active'); // 'Active', 'All', 'Served', 'Cancelled'
  const [soundEnabled, setSoundEnabled] = useState(true);
  const isInitialLoad = useRef(true);

  // Web Audio Synth Bell (Kitchen Ping)
  const playKitchenPing = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // High A5 tone
      osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.3);
      
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      console.warn('Audio play restricted:', e);
    }
  };

  const fetchKitchenOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          customer_name,
          table_id,
          total_amount,
          status,
          order_type,
          is_rush,
          created_at,
          tables (id, table_number),
          order_items (
            id,
            quantity,
            menu_items (name)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('KDS Fetch Error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKitchenOrders();

    // Supabase Live Sync for KDS with Audio Alert
    const channel = supabase
      .channel('kds-live-tickets-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          playKitchenPing();
        }
        fetchKitchenOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [soundEnabled]);

  const updateOrderStatus = async (order, newStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', order.id);

      if (error) throw error;

      // Agar order Served ho gaya aur Dine-In table attached tha, table ko available mark karne ka option
      if (newStatus === 'Served' && order.tables?.id) {
        await supabase
          .from('tables')
          .update({ status: 'Available' })
          .eq('id', order.tables.id);
      }

      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: newStatus } : o));
    } catch (err) {
      alert('Status update failed: ' + err.message);
    }
  };

  const toggleRush = async (orderId, currentRush) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ is_rush: !currentRush })
        .eq('id', orderId);

      if (error) throw error;
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, is_rush: !currentRush } : o));
    } catch (err) {
      alert('Rush toggle failed: ' + err.message);
    }
  };

  const getElapsedMinutes = (dateStr) => {
    return Math.floor((new Date() - new Date(dateStr)) / 60000);
  };

  const filteredOrders = orders.filter(o => {
    if (filter === 'Active') return o.status === 'New' || o.status === 'Preparing';
    if (filter === 'Served') return o.status === 'Served';
    if (filter === 'Cancelled') return o.status === 'Cancelled';
    return true;
  });

  const activeOrdersCount = orders.filter(o => o.status === 'New' || o.status === 'Preparing').length;
  const rushOrdersCount = orders.filter(o => (o.status === 'New' || o.status === 'Preparing') && o.is_rush).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        <p className="text-xs font-semibold text-neutral-400">Connecting to Kitchen Display Stream...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Quick Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-neutral-900 tracking-tight">Kitchen Display Stream (KDS)</h2>
            <span className="bg-orange-50 text-orange-600 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-orange-200 flex items-center gap-1">
              <ChefHat className="w-3 h-3" /> ACTIVE TERMINAL
            </span>
          </div>
          <p className="text-xs font-medium text-neutral-500 mt-0.5">Real-time prep queue, urgent rush tickets & auto table sync.</p>
        </div>

        {/* Audio Toggle & Filters */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) playKitchenPing();
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold border transition cursor-pointer ${
              soundEnabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-neutral-400 border-neutral-200'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-neutral-400" />}
            <span>{soundEnabled ? 'Sound On' : 'Muted'}</span>
          </button>

          <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-neutral-200/80 shadow-2xs">
            {['Active', 'All', 'Served', 'Cancelled'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  filter === f ? 'bg-neutral-900 text-white shadow-xs' : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Real-time Status Metric Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-neutral-100 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase">Active Prep Queue</p>
            <h4 className="text-lg font-black text-neutral-900">{activeOrdersCount} Tickets</h4>
          </div>
          <Timer className="w-5 h-5 text-orange-500" />
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-neutral-100 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-rose-500 uppercase">Rush Orders</p>
            <h4 className="text-lg font-black text-rose-600">{rushOrdersCount} Urgent</h4>
          </div>
          <Flame className="w-5 h-5 text-rose-500" />
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-neutral-100 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase">Total Logged</p>
            <h4 className="text-lg font-black text-neutral-800">{orders.length} Orders</h4>
          </div>
          <Utensils className="w-5 h-5 text-neutral-400" />
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-neutral-100 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-emerald-600 uppercase">Kitchen Stream</p>
            <h4 className="text-lg font-black text-emerald-600">Connected</h4>
          </div>
          <BellRing className="w-5 h-5 text-emerald-500" />
        </div>
      </div>

      {/* Ticket Grid */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-neutral-100 shadow-2xs max-w-md mx-auto space-y-2">
          <Utensils className="w-8 h-8 text-neutral-300 mx-auto" />
          <h3 className="text-sm font-bold text-neutral-700">No Orders in this View</h3>
          <p className="text-xs text-neutral-400">All caught up! New orders placed at POS will show up here automatically with audio alert.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredOrders.map(order => {
            const isRush = order.is_rush;
            const elapsed = getElapsedMinutes(order.created_at);
            const isLate = elapsed >= 15 && order.status !== 'Served' && order.status !== 'Cancelled';

            return (
              <div
                key={order.id}
                className={`bg-white rounded-3xl p-5 border transition flex flex-col justify-between shadow-2xs relative overflow-hidden ${
                  isRush 
                    ? 'border-rose-400 ring-2 ring-rose-400/20 shadow-rose-100' 
                    : isLate 
                    ? 'border-amber-400 ring-2 ring-amber-400/20'
                    : order.status === 'Preparing' 
                    ? 'border-amber-300' 
                    : 'border-neutral-100'
                }`}
              >
                {/* Priority Badges */}
                <div className="flex gap-1 absolute top-0 right-0">
                  {isLate && (
                    <div className="bg-amber-500 text-white text-[9px] font-black px-2.5 py-0.5 rounded-bl-lg tracking-wider flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> DELAYED
                    </div>
                  )}
                  {isRush && (
                    <div className="bg-rose-500 text-white text-[9px] font-black px-3 py-0.5 rounded-bl-xl tracking-wider flex items-center gap-1">
                      <Flame className="w-3 h-3 fill-white" /> RUSH
                    </div>
                  )}
                </div>

                <div>
                  {/* Ticket Header */}
                  <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                    <div>
                      <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">
                        #{order.id.slice(0, 6).toUpperCase()}
                      </span>
                      <h4 className="text-sm font-black text-neutral-900">{order.customer_name}</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                        {order.tables?.table_number ? `Table ${order.tables.table_number}` : 'Takeaway'}
                      </span>
                      <p className={`text-[10px] font-bold mt-1 flex items-center gap-1 justify-end ${
                        isLate ? 'text-amber-600' : 'text-neutral-400'
                      }`}>
                        <Clock className="w-3 h-3" /> {elapsed < 1 ? 'Just now' : `${elapsed}m ago`}
                      </p>
                    </div>
                  </div>

                  {/* Dishes Items List */}
                  <div className="py-3 space-y-2">
                    {order.order_items?.map(it => (
                      <div key={it.id} className="flex justify-between items-center text-xs">
                        <span className="font-extrabold text-neutral-800">
                          {it.menu_items?.name || 'Item'}
                        </span>
                        <span className="font-mono font-black text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded-lg text-[11px]">
                          x{it.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ticket Controls & Actions */}
                <div className="pt-3 border-t border-neutral-100 space-y-2 mt-2">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleRush(order.id, order.is_rush)}
                      className={`text-[10px] font-black px-2.5 py-1 rounded-xl flex items-center gap-1 cursor-pointer transition ${
                        isRush 
                          ? 'bg-rose-50 text-rose-600 border border-rose-200' 
                          : 'bg-neutral-50 text-neutral-500 hover:bg-neutral-100 border border-neutral-200'
                      }`}
                    >
                      <Flame className="w-3 h-3" />
                      <span>{isRush ? 'Remove Rush' : 'Mark Rush'}</span>
                    </button>

                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      order.status === 'Served' ? 'bg-emerald-50 text-emerald-600' :
                      order.status === 'Preparing' ? 'bg-amber-50 text-amber-600' :
                      order.status === 'Cancelled' ? 'bg-rose-50 text-rose-600' :
                      'bg-blue-50 text-blue-600'
                    }`}>
                      {order.status}
                    </span>
                  </div>

                  {/* Status Progression Buttons */}
                  {order.status !== 'Served' && order.status !== 'Cancelled' && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {order.status === 'New' && (
                        <button
                          onClick={() => updateOrderStatus(order, 'Preparing')}
                          className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition shadow-xs"
                        >
                          <ChefHat className="w-3.5 h-3.5" /> Start Cooking
                        </button>
                      )}

                      {order.status === 'Preparing' && (
                        <button
                          onClick={() => updateOrderStatus(order, 'Served')}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition shadow-xs"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Mark Served
                        </button>
                      )}

                      <button
                        onClick={() => updateOrderStatus(order, 'Cancelled')}
                        className="w-full py-2 bg-neutral-100 hover:bg-rose-50 hover:text-rose-600 text-neutral-600 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Cancel Ticket
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}