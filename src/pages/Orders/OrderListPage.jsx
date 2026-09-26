import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  Clock, CheckCircle2, RefreshCw, Loader2, User, Armchair,
  Printer, Utensils, Search
} from 'lucide-react';
import ReceiptModal from '../../components/Receipt/ReceiptModal';

const STATUSES = ['All', 'New', 'Preparing', 'Ready', 'Served', 'Cancelled'];

export default function OrderListPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [receiptOrder, setReceiptOrder] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          tables (id, table_number),
          order_items (
            id, quantity, unit_price, subtotal,
            menu_items (name)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('Fetch orders error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    const subscription = supabase
      .channel('orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const handleStatusUpdate = async (order, newStatus) => {
    setUpdatingId(order.id);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', order.id);

      if (error) throw error;

      if ((newStatus === 'Served' || newStatus === 'Cancelled') && order.tables?.id) {
        await supabase
          .from('tables')
          .update({ status: 'Available' })
          .eq('id', order.tables.id);
      }

      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: newStatus } : o));
    } catch (err) {
      alert('Status update failed: ' + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredOrders = orders.filter(o => {
    if (selectedStatus !== 'All' && o.status !== selectedStatus) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const customer = (o.customer_name || '').toLowerCase();
      const tableNum = o.tables?.table_number ? `table ${o.tables.table_number}` : '';
      return customer.includes(q) || tableNum.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-neutral-900 tracking-tight">Kitchen & Live Order Tickets</h2>
          <p className="text-xs font-medium text-neutral-500 mt-0.5">Real-time KDS Dispatcher & Thermal Billing Center</p>
        </div>

        <button
          onClick={fetchOrders}
          className="flex items-center gap-2 bg-white border border-neutral-200/90 text-neutral-700 px-4 py-2 rounded-2xl text-xs font-bold shadow-2xs hover:bg-neutral-50 cursor-pointer w-fit"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Tickets</span>
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUSES.map(st => {
            const count = st === 'All' ? orders.length : orders.filter(o => o.status === st).length;
            const isActive = selectedStatus === st;
            return (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                  isActive
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                    : 'bg-white text-neutral-600 border border-neutral-200/80 shadow-2xs'
                }`}
              >
                <span>{st}</span>
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
            placeholder="Search customer or table..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-neutral-200 rounded-2xl pl-10 pr-4 py-2 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-orange-500 shadow-2xs"
          />
        </div>
      </div>

      {/* Orders Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-28">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-neutral-100 shadow-2xs">
          <Utensils className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-neutral-800">No active orders found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredOrders.map((o) => (
            <div key={o.id} className="bg-white rounded-3xl p-5 border border-neutral-100 shadow-2xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-orange-500" />
                    <span className="text-xs font-extrabold text-neutral-900">{o.customer_name || 'Guest'}</span>
                  </div>
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
                    o.status === 'New' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    o.status === 'Preparing' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                    o.status === 'Ready' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    o.status === 'Served' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    'bg-neutral-100 text-neutral-600 border-neutral-200'
                  }`}>
                    {o.status}
                  </span>
                </div>

                <div className="flex items-center justify-between my-3 text-xs text-neutral-500 font-medium">
                  <span className="flex items-center gap-1">
                    <Armchair className="w-3.5 h-3.5 text-neutral-400" />
                    {o.tables?.table_number ? `Table ${o.tables.table_number}` : 'Takeaway'}
                  </span>
                  <span className="font-mono text-[10px] text-neutral-400">
                    {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="space-y-1.5 bg-neutral-50 p-3 rounded-2xl border border-neutral-100">
                  {o.order_items?.map((item) => (
                    <div key={item.id} className="flex justify-between text-xs font-semibold text-neutral-700">
                      <span>{item.quantity}× {item.menu_items?.name || 'Item'}</span>
                      <span className="font-mono text-neutral-900">Rs. {item.subtotal}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => setReceiptOrder(o)}
                  className="p-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                  title="Print Thermal Receipt"
                >
                  <Printer className="w-4 h-4 text-orange-500" />
                  <span>Receipt</span>
                </button>

                <select
                  value={o.status}
                  disabled={updatingId === o.id}
                  onChange={(e) => handleStatusUpdate(o, e.target.value)}
                  className="text-xs bg-neutral-50 border border-neutral-200 rounded-xl px-2.5 py-2 font-bold text-neutral-800 focus:outline-none cursor-pointer"
                >
                  <option value="New">New</option>
                  <option value="Preparing">Preparing</option>
                  <option value="Ready">Ready</option>
                  <option value="Served">Served (Release Table)</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Integrated Thermal Receipt Component */}
      {receiptOrder && (
        <ReceiptModal 
          order={receiptOrder} 
          onClose={() => setReceiptOrder(null)} 
        />
      )}
    </div>
  );
}