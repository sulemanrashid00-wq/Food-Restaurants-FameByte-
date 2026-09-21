import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  Plus, Minus, Trash2, Loader2, CheckCircle, Search, 
  Armchair, Sparkles, User, Tag, ArrowRight, UtensilsCrossed
} from 'lucide-react';

export default function NewOrderPage() {
  const [tables, setTables] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [orderType, setOrderType] = useState('Dine-In');
  const [promoCode, setPromoCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [tablesRes, menuRes] = await Promise.all([
          supabase.from('tables').select('*').order('table_number', { ascending: true }),
          supabase.from('menu_items').select('*').eq('is_available', true).order('name', { ascending: true })
        ]);

        if (tablesRes.error) throw tablesRes.error;
        if (menuRes.error) throw menuRes.error;

        setTables(tablesRes.data || []);
        setMenuItems(menuRes.data || []);
      } catch (err) {
        console.error('Data loading error:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (itemId, delta) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.id === itemId) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (itemId) => {
    setCart((prev) => prev.filter((i) => i.id !== itemId));
  };

  const clearCart = () => setCart([]);

  // Price Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.05; // 5% Tax Calculation
  const grandTotal = Math.max(0, subtotal + tax - discountAmount);

  const applyPromo = () => {
    if (promoCode.trim().toUpperCase() === 'FAME10') {
      setDiscountAmount(subtotal * 0.1);
    } else {
      alert('Invalid promo code. Use code "FAME10" for 10% discount.');
    }
  };

  const handlePlaceOrder = async () => {
    setErrorMessage('');
    if (cart.length === 0) {
      alert('Please add items to cart before placing an order.');
      return;
    }

    setSubmitting(true);
    try {
      const selectedTableObj = tables.find(t => t.id === selectedTable || t.table_number.toString() === selectedTable);

      // 1. Insert Order Entry
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{
          table_id: selectedTableObj ? selectedTableObj.id : null,
          customer_name: customerName.trim() || 'Walk-in Guest',
          order_type: orderType,
          status: 'New',
          subtotal: subtotal,
          tax: tax,
          discount: discountAmount,
          total_amount: grandTotal
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Insert Order Items Breakdown
      const orderItemsToInsert = cart.map((item) => ({
        order_id: orderData.id,
        menu_item_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        subtotal: item.price * item.quantity
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItemsToInsert);
      if (itemsError) throw itemsError;

      // 3. Auto Occupy Table Status
      if (selectedTableObj) {
        await supabase.from('tables').update({ status: 'Occupied' }).eq('id', selectedTableObj.id);
      }

      // Reset Inputs & Refresh Tables List
      setCart([]);
      setCustomerName('');
      setSelectedTable('');
      setDiscountAmount(0);
      setPromoCode('');
      setOrderSuccess(true);
      setTimeout(() => setOrderSuccess(false), 4000);

      const { data: updatedTables } = await supabase.from('tables').select('*').order('table_number', { ascending: true });
      setTables(updatedTables || []);
    } catch (err) {
      console.error('Order creation error:', err);
      setErrorMessage(err.message || 'Error processing request.');
    } finally {
      setSubmitting(false);
    }
  };

  const categories = ['All', ...new Set(menuItems.map((i) => i.category).filter(Boolean))];
  const filteredMenu = menuItems.filter((i) => {
    if (selectedCategory !== 'All' && i.category !== selectedCategory) return false;
    if (searchQuery.trim() !== '') {
      return i.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      {/* LEFT SECTION: Menu Catalog */}
      <div className="lg:col-span-8 space-y-5">
        
        {/* Header & Filter Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-extrabold transition whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-neutral-900 text-white shadow-sm'
                    : 'bg-white text-neutral-600 border border-neutral-200/80 hover:bg-orange-50/50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search food items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-neutral-200/90 rounded-full text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-400 shadow-2xs"
            />
          </div>
        </div>

        {/* Menu Items Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredMenu.map((item) => (
            <div
              key={item.id}
              onClick={() => addToCart(item)}
              className="bg-white rounded-3xl p-3.5 border border-neutral-100 hover:border-orange-200/90 shadow-2xs hover:shadow-lg transition duration-200 cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="h-32 rounded-2xl overflow-hidden mb-3 bg-neutral-100 relative">
                  <img src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-xs w-7 h-7 rounded-full flex items-center justify-center text-neutral-800 shadow-xs group-hover:bg-orange-500 group-hover:text-white transition">
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                  </div>
                </div>

                <h4 className="font-extrabold text-xs text-neutral-900 group-hover:text-orange-600 transition tracking-tight">{item.name}</h4>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-0.5">{item.category}</p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between">
                <span className="text-xs font-black text-neutral-900 font-mono">Rs. {item.price}</span>
                <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">Add to Cart</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT SECTION: Order Summary Panel */}
      <div className="lg:col-span-4 bg-white rounded-3xl p-5 border border-neutral-100/90 shadow-xs space-y-4 sticky top-6">
        
        {/* Panel Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <h3 className="text-sm font-extrabold text-neutral-900 tracking-tight">Order Summary</h3>
          {cart.length > 0 && (
            <button onClick={clearCart} className="text-[11px] font-bold text-rose-500 hover:underline cursor-pointer">
              Clear All
            </button>
          )}
        </div>

        {orderSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Order successfully sent to kitchen!</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-2xl">
            {errorMessage}
          </div>
        )}

        {/* Customer & Location Details Form */}
        <div className="space-y-3 bg-neutral-50/80 p-3.5 rounded-2xl border border-neutral-100">
          <div>
            <label className="block text-[11px] font-bold text-neutral-600 mb-1">Customer Name</label>
            <div className="relative">
              <User className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Enter guest name..."
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-neutral-200/90 rounded-xl text-xs font-semibold text-neutral-800 focus:outline-none focus:ring-1 focus:ring-orange-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-neutral-600 mb-1">Table Location</label>
              <select
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                className="w-full bg-white border border-neutral-200/90 rounded-xl px-2.5 py-1.5 text-xs font-bold text-neutral-800 focus:outline-none cursor-pointer"
              >
                <option value="">Select Table</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>Table {t.table_number} ({t.status})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-600 mb-1">Order Type</label>
              <select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value)}
                className="w-full bg-white border border-neutral-200/90 rounded-xl px-2.5 py-1.5 text-xs font-bold text-neutral-800 focus:outline-none cursor-pointer"
              >
                <option value="Dine-In">Dine-In</option>
                <option value="Takeaway">Takeaway</option>
                <option value="Delivery">Delivery</option>
              </select>
            </div>
          </div>
        </div>

        {/* Order Items Breakdown List */}
        <div>
          <h4 className="text-xs font-extrabold text-neutral-800 mb-2">Order Items</h4>
          
          {cart.length === 0 ? (
            <div className="text-center py-8 bg-neutral-50/50 rounded-2xl border border-dashed border-neutral-200">
              <UtensilsCrossed className="w-7 h-7 text-neutral-300 mx-auto mb-1.5" />
              <p className="text-xs font-bold text-neutral-500">Cart is Empty</p>
              <p className="text-[10px] text-neutral-400 mt-0.5">Select menu items to add to ticket.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between bg-neutral-50/80 p-2.5 rounded-2xl border border-neutral-100">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {item.image_url && (
                      <img src={item.image_url} alt={item.name} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                    )}
                    <div className="min-w-0">
                      <h5 className="text-xs font-bold text-neutral-900 truncate tracking-tight">{item.name}</h5>
                      <p className="text-[10px] font-mono font-semibold text-neutral-400">Rs. {item.price}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 bg-white border border-neutral-200/90 rounded-xl p-0.5 shadow-2xs">
                      <button onClick={() => updateQuantity(item.id, -1)} className="p-1 text-neutral-500 hover:text-orange-600 transition cursor-pointer">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-extrabold px-1 font-mono text-neutral-900">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="p-1 text-neutral-500 hover:text-orange-600 transition cursor-pointer">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-neutral-400 hover:text-rose-500 p-1 cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Promo Code Entry */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Tag className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Enter promo code..."
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-neutral-50 border border-neutral-200/90 rounded-xl text-xs font-semibold focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={applyPromo}
            className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Apply
          </button>
        </div>

        {/* Total Payment Calculations */}
        <div className="pt-3 border-t border-neutral-100 space-y-1.5 text-xs font-semibold">
          <div className="flex justify-between text-neutral-500">
            <span>Subtotal:</span>
            <span className="font-mono font-bold text-neutral-800">Rs. {subtotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-neutral-500">
            <span>Tax (5%):</span>
            <span className="font-mono font-bold text-neutral-800">Rs. {tax.toFixed(2)}</span>
          </div>

          {discountAmount > 0 && (
            <div className="flex justify-between text-emerald-600 font-bold">
              <span>Discount:</span>
              <span className="font-mono">- Rs. {discountAmount.toFixed(2)}</span>
            </div>
          )}

          <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-sm font-extrabold text-neutral-900">
            <span>Grand Total:</span>
            <span className="text-base font-black font-mono text-orange-600">Rs. {grandTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Submit CTA Button */}
        <button
          onClick={handlePlaceOrder}
          disabled={submitting || cart.length === 0}
          className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl text-xs font-extrabold shadow-md shadow-orange-500/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          <span>Proceed as Order</span>
          <ArrowRight className="w-4 h-4" />
        </button>

      </div>

    </div>
  );
}