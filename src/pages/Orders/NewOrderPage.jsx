import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  ShoppingBag, Search, Plus, Minus, Trash2, 
  CreditCard, Banknote, QrCode, Split, 
  CheckCircle2, Loader2 
} from 'lucide-react';

export default function NewOrderPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [tables, setTables] = useState([]);
  const [cart, setCart] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Checkout States
  const [selectedTable, setSelectedTable] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [orderType, setOrderType] = useState('Dine-In');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [splitCount, setSplitCount] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Parallel Fast Fetch
  const fetchInitialData = useCallback(async () => {
    try {
      const [menuRes, tablesRes] = await Promise.all([
        supabase
          .from('menu_items')
          .select('*')
          .eq('is_available', true)
          .order('name'),
        supabase
          .from('tables')
          .select('*')
          .order('table_number')
      ]);

      if (menuRes.error) throw menuRes.error;
      if (tablesRes.error) throw tablesRes.error;

      const menuData = menuRes.data || [];
      setMenuItems(menuData);

      const uniqueCats = ['All', ...new Set(menuData.map(item => item.category).filter(Boolean))];
      setCategories(uniqueCats);

      setTables(tablesRes.data || []);
    } catch (err) {
      console.error('Fast fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Cart Handlers
  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const nextQty = item.quantity + delta;
        return nextQty > 0 ? { ...item, quantity: nextQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  // Math Calculations
  const subtotal = cart.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
  const tax = subtotal * 0.05;
  const netTotal = subtotal + tax;
  const splitAmount = splitCount > 1 ? (netTotal / splitCount) : netTotal;

  // Place Order Action
  const handlePlaceOrder = async () => {
    if (cart.length === 0) return alert('Cart is empty!');
    if (orderType === 'Dine-In' && !selectedTable) return alert('Please select a table for Dine-In!');

    setSubmitting(true);
    try {
      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .insert([{
          customer_name: customerName.trim() || 'Walk-in Guest',
          table_id: orderType === 'Dine-In' ? selectedTable : null,
          total_amount: netTotal,
          status: 'New',
          order_type: orderType,
          payment_method: paymentMethod,
          payment_status: 'Paid',
          split_count: splitCount
        }])
        .select()
        .single();

      if (orderErr) throw orderErr;

      const orderItemsToInsert = cart.map(item => ({
        order_id: orderData.id,
        menu_item_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        subtotal: item.price * item.quantity
      }));

      const { error: itemsErr } = await supabase.from('order_items').insert(orderItemsToInsert);
      if (itemsErr) throw itemsErr;

      if (orderType === 'Dine-In' && selectedTable) {
        await supabase
          .from('tables')
          .update({ status: 'Occupied' })
          .eq('id', selectedTable);
      }

      alert('Order Placed Successfully! Sent to KDS.');
      setCart([]);
      setSelectedTable('');
      setCustomerName('');
      setSplitCount(1);
      
      // Fast refresh tables after occupying
      fetchInitialData();
    } catch (err) {
      alert('Order placement error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = menuItems.filter(item => {
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesQuery = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center py-28">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-12">
      {/* Left Menu Section (7 cols) */}
      <div className="lg:col-span-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-neutral-900 tracking-tight">VIP Point of Sale</h2>
            <p className="text-xs font-medium text-neutral-500">Pick dishes and dispatch directly to kitchen</p>
          </div>

          <div className="relative w-full sm:w-60">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search dishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-neutral-200 rounded-2xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-orange-500 shadow-2xs"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap cursor-pointer transition ${
                selectedCategory === cat
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'bg-white text-neutral-600 border border-neutral-200/80 shadow-2xs'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Dishes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredItems.map(item => (
            <div 
              key={item.id} 
              onClick={() => addToCart(item)}
              className="bg-white p-4 rounded-3xl border border-neutral-100 shadow-2xs hover:border-orange-200 transition cursor-pointer flex justify-between items-center group"
            >
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">{item.category}</span>
                <h4 className="text-xs font-extrabold text-neutral-800 group-hover:text-orange-500 transition">{item.name}</h4>
                <p className="text-xs font-mono font-bold text-neutral-900">Rs. {Number(item.price).toFixed(2)}</p>
              </div>
              <button 
                className="w-8 h-8 rounded-2xl bg-neutral-100 group-hover:bg-orange-500 group-hover:text-white flex items-center justify-center transition"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Right Cart & Checkout Module (5 cols) */}
      <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-neutral-100 shadow-2xs space-y-5 h-fit">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-orange-500" />
            <h3 className="text-base font-black text-neutral-900">Checkout Terminal</h3>
          </div>
          <span className="text-xs font-bold text-neutral-400">{cart.length} items</span>
        </div>

        {/* Order Details Inputs */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setOrderType('Dine-In')}
              className={`py-2 rounded-2xl text-xs font-bold border transition cursor-pointer ${
                orderType === 'Dine-In' ? 'bg-orange-50 border-orange-500 text-orange-600' : 'border-neutral-200 text-neutral-600'
              }`}
            >
              Dine-In
            </button>
            <button
              onClick={() => setOrderType('Takeaway')}
              className={`py-2 rounded-2xl text-xs font-bold border transition cursor-pointer ${
                orderType === 'Takeaway' ? 'bg-orange-50 border-orange-500 text-orange-600' : 'border-neutral-200 text-neutral-600'
              }`}
            >
              Takeaway
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-neutral-400 uppercase">Customer Name</label>
              <input
                type="text"
                placeholder="Guest"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="w-full mt-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none"
              />
            </div>

            {orderType === 'Dine-In' && (
              <div>
                <label className="text-[10px] font-bold text-neutral-400 uppercase">Table Select</label>
                <select
                  value={selectedTable}
                  onChange={e => setSelectedTable(e.target.value)}
                  className="w-full mt-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-1.5 text-xs font-bold text-neutral-800 focus:outline-none cursor-pointer"
                >
                  <option value="">Select Table</option>
                  {tables.map(t => (
                    <option key={t.id} value={t.id} disabled={t.status === 'Occupied'}>
                      Table {t.table_number} ({t.status})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Cart Item List */}
        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
          {cart.length === 0 ? (
            <p className="text-center py-6 text-xs text-neutral-400">Cart is empty. Click items to add.</p>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex items-center justify-between p-2 rounded-2xl bg-neutral-50 border border-neutral-100">
                <div className="min-w-0 pr-2">
                  <h5 className="text-xs font-extrabold text-neutral-800 truncate">{item.name}</h5>
                  <span className="text-[10px] text-neutral-400 font-mono">Rs. {item.price} each</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-white border border-neutral-200 rounded-xl px-2 py-0.5">
                    <button onClick={() => updateQuantity(item.id, -1)} className="text-neutral-500 hover:text-black">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="text-neutral-500 hover:text-black">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="text-neutral-400 hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Payment Selector */}
        <div className="space-y-2 pt-2 border-t border-neutral-100">
          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Payment Method</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'Cash', icon: Banknote, label: 'Cash' },
              { id: 'Card', icon: CreditCard, label: 'Card' },
              { id: 'QR', icon: QrCode, label: 'Digital QR' }
            ].map(method => {
              const Icon = method.icon;
              return (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id)}
                  className={`flex flex-col items-center justify-center p-2 rounded-2xl border text-xs font-bold transition cursor-pointer ${
                    paymentMethod === method.id 
                      ? 'bg-orange-50 border-orange-500 text-orange-600' 
                      : 'border-neutral-200 text-neutral-500 hover:bg-neutral-50'
                  }`}
                >
                  <Icon className="w-4 h-4 mb-1" />
                  <span>{method.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Split Bill Calculator */}
        <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-100 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-bold text-neutral-700">
              <Split className="w-3.5 h-3.5 text-orange-500" />
              <span>Split Bill Persons:</span>
            </span>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map(num => (
                <button
                  key={num}
                  onClick={() => setSplitCount(num)}
                  className={`w-6 h-6 rounded-lg text-xs font-black transition cursor-pointer ${
                    splitCount === num ? 'bg-orange-500 text-white' : 'bg-white border border-neutral-200 text-neutral-600'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
          {splitCount > 1 && (
            <div className="flex justify-between items-center text-xs font-bold text-orange-600 pt-1 border-t border-neutral-200/60">
              <span>Each Person Pays:</span>
              <span className="font-mono">Rs. {splitAmount.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="space-y-1.5 pt-2 border-t border-neutral-100 text-xs">
          <div className="flex justify-between text-neutral-500">
            <span>Subtotal:</span>
            <span className="font-mono font-bold">Rs. {subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-neutral-500">
            <span>GST (5%):</span>
            <span className="font-mono font-bold">Rs. {tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-base font-black text-neutral-900 pt-1 border-t border-neutral-200">
            <span>Grand Total:</span>
            <span className="font-mono text-orange-600">Rs. {netTotal.toFixed(2)}</span>
          </div>
        </div>

        <button
          onClick={handlePlaceOrder}
          disabled={submitting || cart.length === 0}
          className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-500/25 transition disabled:opacity-50"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>Confirm & Send to Kitchen (KDS)</span>
        </button>
      </div>
    </div>
  );
}