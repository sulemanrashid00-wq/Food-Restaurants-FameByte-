import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { 
  Vault, DollarSign, CreditCard, QrCode, 
  Printer, Lock, Loader2, RefreshCw 
} from 'lucide-react';

export default function BillingPage() {
  const { profile } = useAuth();
  const [activeShift, setActiveShift] = useState(null);
  const [openingFloat, setOpeningFloat] = useState('');
  const [countedCash, setCountedCash] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [shiftReport, setShiftReport] = useState(null);

  const fetchActiveShift = async () => {
    setLoading(true);
    try {
      const { data: shift, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('status', 'Open')
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setActiveShift(shift);

      if (shift) {
        const { data: orders, error: ordersErr } = await supabase
          .from('orders')
          .select('total_amount, payment_method, status')
          .gte('created_at', shift.opened_at);

        if (ordersErr) throw ordersErr;

        const validOrders = orders?.filter(o => o.status !== 'Cancelled') || [];
        const cashOrders = validOrders.filter(o => o.payment_method === 'Cash');
        const cardOrders = validOrders.filter(o => o.payment_method === 'Card');
        const qrOrders = validOrders.filter(o => o.payment_method === 'QR');

        const totalCashSales = cashOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
        const totalCardSales = cardOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
        const totalQrSales = qrOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
        const totalGrossSales = totalCashSales + totalCardSales + totalQrSales;
        const expectedInDrawer = Number(shift.opening_cash) + totalCashSales;

        setShiftReport({
          totalOrdersCount: validOrders.length,
          totalCashSales,
          totalCardSales,
          totalQrSales,
          totalGrossSales,
          expectedInDrawer
        });
      }
    } catch (err) {
      console.error('Shift fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveShift();
  }, []);

  const handleOpenShift = async (e) => {
    e.preventDefault();
    const floatAmount = parseFloat(openingFloat);
    if (isNaN(floatAmount) || floatAmount < 0) return alert('Enter valid opening cash');

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('shifts')
        .insert([{
          opened_by: profile?.full_name || 'Cashier',
          opening_cash: floatAmount,
          status: 'Open'
        }])
        .select()
        .single();

      if (error) throw error;
      setActiveShift(data);
      setOpeningFloat('');
      fetchActiveShift();
    } catch (err) {
      alert('Failed to open shift: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseShift = async () => {
    const actualCash = parseFloat(countedCash);
    if (isNaN(actualCash) || actualCash < 0) return alert('Please enter counted cash in drawer');

    const expected = shiftReport?.expectedInDrawer || 0;
    const variance = actualCash - expected;

    if (!confirm(`Confirm shift closing?\nExpected Cash: Rs. ${expected.toFixed(2)}\nCounted Cash: Rs. ${actualCash.toFixed(2)}\nDifference: Rs. ${variance.toFixed(2)}`)) {
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('shifts')
        .update({
          closing_cash: actualCash,
          expected_cash: expected,
          cash_variance: variance,
          total_card_sales: shiftReport?.totalCardSales || 0,
          total_qr_sales: shiftReport?.totalQrSales || 0,
          total_sales: shiftReport?.totalGrossSales || 0,
          total_orders_count: shiftReport?.totalOrdersCount || 0,
          status: 'Closed',
          closed_at: new Date().toISOString()
        })
        .eq('id', activeShift.id);

      if (error) throw error;
      alert('Shift settled and closed successfully!');
      setActiveShift(null);
      setShiftReport(null);
      setCountedCash('');
      fetchActiveShift();
    } catch (err) {
      alert('Failed to close shift: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-28">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #z-report-slip, #z-report-slip * {
            visibility: visible !important;
          }
          #z-report-slip {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            padding: 10px !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-neutral-900 tracking-tight">Billing & Register Settlement</h2>
            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
              activeShift ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-neutral-100 text-neutral-600 border-neutral-200'
            }`}>
              {activeShift ? 'DRAWER ACTIVE' : 'DRAWER LOCKED'}
            </span>
          </div>
          <p className="text-xs font-medium text-neutral-500 mt-0.5">End-of-day register reconciliation, float management, and cash variance settlement.</p>
        </div>

        <button
          onClick={fetchActiveShift}
          className="flex items-center gap-2 bg-white border border-neutral-200/90 text-neutral-700 px-4 py-2 rounded-2xl text-xs font-bold shadow-2xs hover:bg-neutral-50 cursor-pointer w-fit"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Register</span>
        </button>
      </div>

      {!activeShift ? (
        <div className="bg-white rounded-3xl p-8 max-w-md mx-auto border border-neutral-100 shadow-2xs text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto shadow-xs">
            <Vault className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-black text-neutral-900">Start New Register Shift</h3>
            <p className="text-xs text-neutral-400 mt-1">Declare the opening cash float in the register drawer to start taking orders.</p>
          </div>

          <form onSubmit={handleOpenShift} className="space-y-4 pt-2 text-left">
            <div>
              <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">
                Opening Cash Float (Rs.) *
              </label>
              <input
                type="number"
                step="any"
                min="0"
                required
                placeholder="e.g. 5000"
                value={openingFloat}
                onChange={e => setOpeningFloat(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-2.5 text-xs font-mono font-bold focus:outline-none focus:border-orange-500 shadow-2xs"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition cursor-pointer"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              <span>Open Cash Drawer</span>
            </button>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-5">
            <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-2xs space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Active Cashier</span>
                  <h4 className="text-sm font-black text-neutral-800">{activeShift.opened_by}</h4>
                </div>
                <span className="text-xs font-mono text-neutral-400">
                  Opened: {new Date(activeShift.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-neutral-50 p-3.5 rounded-2xl border border-neutral-100">
                  <div className="flex items-center gap-1.5 text-neutral-400 mb-1">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-[10px] font-bold uppercase">Cash Sales</span>
                  </div>
                  <p className="text-sm font-mono font-black text-neutral-900">Rs. {shiftReport?.totalCashSales.toFixed(2)}</p>
                </div>

                <div className="bg-neutral-50 p-3.5 rounded-2xl border border-neutral-100">
                  <div className="flex items-center gap-1.5 text-neutral-400 mb-1">
                    <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-[10px] font-bold uppercase">Card Sales</span>
                  </div>
                  <p className="text-sm font-mono font-black text-neutral-900">Rs. {shiftReport?.totalCardSales.toFixed(2)}</p>
                </div>

                <div className="bg-neutral-50 p-3.5 rounded-2xl border border-neutral-100">
                  <div className="flex items-center gap-1.5 text-neutral-400 mb-1">
                    <QrCode className="w-3.5 h-3.5 text-orange-500" />
                    <span className="text-[10px] font-bold uppercase">QR Sales</span>
                  </div>
                  <p className="text-sm font-mono font-black text-neutral-900">Rs. {shiftReport?.totalQrSales.toFixed(2)}</p>
                </div>
              </div>

              <div className="p-4 bg-orange-50/60 rounded-2xl border border-orange-100 space-y-2 text-xs">
                <div className="flex justify-between text-neutral-600">
                  <span>Opening Cash Float:</span>
                  <span className="font-mono font-bold">Rs. {Number(activeShift.opening_cash).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Cash Collected From Orders:</span>
                  <span className="font-mono font-bold">+ Rs. {shiftReport?.totalCashSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-neutral-900 pt-2 border-t border-orange-200">
                  <span>Expected Cash in Drawer:</span>
                  <span className="font-mono text-orange-600">Rs. {shiftReport?.expectedInDrawer.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">
                  Physically Counted Cash in Drawer (Closing) *
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="Enter total physical cash counted..."
                    value={countedCash}
                    onChange={e => setCountedCash(e.target.value)}
                    className="flex-1 bg-white border border-neutral-200 rounded-2xl px-4 py-2.5 text-xs font-mono font-bold focus:outline-none focus:border-orange-500 shadow-2xs"
                  />
                  <button
                    onClick={handleCloseShift}
                    disabled={submitting || !countedCash}
                    className="bg-neutral-900 hover:bg-black text-white px-5 py-2.5 rounded-2xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                    <span>Close Shift & Settle</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div 
              id="z-report-slip" 
              className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-2xs font-mono text-xs space-y-3 text-neutral-800"
            >
              <div className="text-center pb-3 border-b border-dashed border-neutral-300">
                <h3 className="text-base font-black uppercase text-black">*** END OF DAY Z-REPORT ***</h3>
                <p className="text-[10px] text-neutral-500">DELICIOUS POS - AUDIT SLIP</p>
                <p className="text-[10px] text-neutral-400 mt-1">{new Date().toLocaleString()}</p>
              </div>

              <div className="py-2 border-b border-dashed border-neutral-300 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Shift Cashier:</span>
                  <span className="font-bold">{activeShift.opened_by}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shift ID:</span>
                  <span>#{activeShift.id.slice(0, 8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Orders:</span>
                  <span className="font-bold">{shiftReport?.totalOrdersCount} Tickets</span>
                </div>
              </div>

              <div className="py-2 border-b border-dashed border-neutral-300 space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span>Opening Float:</span>
                  <span>Rs. {Number(activeShift.opening_cash).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cash Revenue:</span>
                  <span>Rs. {shiftReport?.totalCashSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Card Revenue:</span>
                  <span>Rs. {shiftReport?.totalCardSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>QR / Digital Revenue:</span>
                  <span>Rs. {shiftReport?.totalQrSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-black text-black pt-1 border-t border-neutral-200">
                  <span>GROSS SHIFT SALES:</span>
                  <span>Rs. {shiftReport?.totalGrossSales.toFixed(2)}</span>
                </div>
              </div>

              <div className="py-2 border-b border-dashed border-neutral-300 space-y-1 text-[11px]">
                <div className="flex justify-between font-bold">
                  <span>Expected Drawer Cash:</span>
                  <span>Rs. {shiftReport?.expectedInDrawer.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Counted Drawer Cash:</span>
                  <span>Rs. {countedCash ? Number(countedCash).toFixed(2) : '0.00'}</span>
                </div>
                {countedCash && (
                  <div className="flex justify-between font-black text-sm pt-1 border-t border-neutral-200">
                    <span>CASH VARIANCE:</span>
                    <span className={Number(countedCash) - shiftReport?.expectedInDrawer < 0 ? 'text-rose-600' : 'text-emerald-600'}>
                      Rs. {(Number(countedCash) - shiftReport?.expectedInDrawer).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={() => window.print()}
                className="no-print mt-3 w-full bg-orange-500 hover:bg-orange-600 text-white font-sans font-bold py-2.5 rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-orange-500/20"
              >
                <Printer className="w-4 h-4" />
                <span>Print Z-Report Slip</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}