import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Loader2,
  Lock,
  Printer,
  QrCode,
  RefreshCw,
  Vault,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';

const money = (value) => {
  const amount = Number(value ?? 0);
  return `Rs. ${Number.isFinite(amount) ? amount.toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) : '0.00'}`;
};

export default function BillingPage() {
  const { profile } = useAuth();
  const [activeShift, setActiveShift] = useState(null);
  const [openingFloat, setOpeningFloat] = useState('5000');
  const [countedCash, setCountedCash] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [shiftReport, setShiftReport] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchActiveShift = useCallback(async (manualRefresh = false) => {
    if (manualRefresh) setRefreshing(true);
    else setLoading(true);

    setErrorMessage('');

    try {
      const { data: shift, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('status', 'Open')
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setActiveShift(shift ?? null);

      if (!shift) {
        setShiftReport(null);
        return;
      }

      if (!shift.opened_at) {
        throw new Error('This shift has no opened_at timestamp, so its sales cannot be reconciled safely.');
      }

      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('total_amount, payment_method, status')
        .gte('created_at', shift.opened_at);

      if (ordersError) throw ordersError;

      const validOrders = (orders ?? []).filter(
        (order) => String(order.status ?? '').toLowerCase() !== 'cancelled',
      );

      const sumFor = (method) =>
        validOrders
          .filter(
            (order) =>
              String(order.payment_method ?? '').toLowerCase() ===
              method.toLowerCase(),
          )
          .reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0);

      const totalCashSales = sumFor('Cash');
      const totalCardSales = sumFor('Card');
      const totalQrSales = sumFor('QR');

      setShiftReport({
        totalOrdersCount: validOrders.length,
        totalCashSales,
        totalCardSales,
        totalQrSales,
        totalGrossSales: totalCashSales + totalCardSales + totalQrSales,
        expectedInDrawer: Number(shift.opening_cash ?? 0) + totalCashSales,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to load register data.';
      setErrorMessage(message);
      console.error('Shift fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchActiveShift();

    const channel = supabase
      .channel('billing-shift-and-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shifts' },
        () => void fetchActiveShift(true),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => void fetchActiveShift(true),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchActiveShift]);

  const handleOpenShift = async (event) => {
    event.preventDefault();
    const floatAmount = Number(openingFloat);

    if (!Number.isFinite(floatAmount) || floatAmount < 0) {
      setErrorMessage('Enter a valid opening cash amount (zero or greater).');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const { data, error } = await supabase
        .from('shifts')
        .insert([
          {
            opened_by: profile?.full_name || 'Cashier',
            opening_cash: floatAmount,
            status: 'Open',
          },
        ])
        .select('*')
        .single();

      if (error) throw error;

      setActiveShift(data);
      setOpeningFloat('5000');
      setSuccessMessage('Register shift opened successfully.');
      await fetchActiveShift();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to open shift.';
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  const expectedCash = shiftReport?.expectedInDrawer ?? 0;
  const variance =
    countedCash.trim() === '' ? null : Number(countedCash) - expectedCash;

  const handleCloseShift = async () => {
    if (!activeShift) return;

    const actualCash = Number(countedCash);
    if (
      countedCash.trim() === '' ||
      !Number.isFinite(actualCash) ||
      actualCash < 0
    ) {
      setErrorMessage('Enter the physical cash counted (zero or greater).');
      return;
    }

    if (!shiftReport) {
      setErrorMessage('The shift report is not ready. Refresh and try again.');
      return;
    }

    const difference = actualCash - shiftReport.expectedInDrawer;
    const confirmed = window.confirm(
      `Confirm shift closing?\nExpected cash: ${money(shiftReport.expectedInDrawer)}\nCounted cash: ${money(actualCash)}\nDifference: ${money(difference)}`,
    );
    if (!confirmed) return;

    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const { error } = await supabase
        .from('shifts')
        .update({
          closing_cash: actualCash,
          expected_cash: shiftReport.expectedInDrawer,
          cash_variance: difference,
          total_card_sales: shiftReport.totalCardSales,
          total_qr_sales: shiftReport.totalQrSales,
          total_sales: shiftReport.totalGrossSales,
          total_orders_count: shiftReport.totalOrdersCount,
          status: 'Closed',
          closed_at: new Date().toISOString(),
        })
        .eq('id', activeShift.id)
        .eq('status', 'Open');

      if (error) throw error;

      setSuccessMessage('Shift settled and closed successfully.');
      setCountedCash('');
      await fetchActiveShift();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to close shift.';
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  const reportReady = Boolean(activeShift && shiftReport);
  const reportTime = useMemo(() => new Date().toLocaleString(), []);

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center bg-neutral-50">
        <div className="flex items-center gap-3 text-sm font-medium text-neutral-500">
          <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
          Loading billing register…
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-full space-y-6 bg-neutral-50/60 px-4 py-5 text-neutral-900 sm:px-6 lg:px-8">
      <style>{`
        @media print {
          @page { size: 80mm auto; margin: 4mm; }
          body * { visibility: hidden !important; }
          #z-report-slip, #z-report-slip * { visibility: visible !important; }
          #z-report-slip {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 72mm !important;
            max-width: 72mm !important;
            padding: 0 !important;
            margin: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Billing &amp; Register
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${
                activeShift
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-neutral-200 bg-neutral-100 text-neutral-600'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  activeShift ? 'bg-emerald-500' : 'bg-neutral-400'
                }`}
              />
              {activeShift ? 'Drawer active' : 'Drawer locked'}
            </span>
          </div>
          <p className="mt-1.5 max-w-2xl text-sm text-neutral-500">
            Manage opening float, reconcile payment totals, and settle the cash
            drawer with a printable Z-report.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void fetchActiveShift(true)}
          disabled={refreshing}
          className="inline-flex min-h-10 w-fit items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-bold text-neutral-700 shadow-sm transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing…' : 'Refresh register'}
        </button>
      </header>

      {errorMessage && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-bold">Action needs attention</p>
              <p className="mt-0.5 break-words text-rose-700">{errorMessage}</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Dismiss error"
            onClick={() => setErrorMessage('')}
            className="rounded-lg p-1 hover:bg-rose-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="font-semibold">{successMessage}</p>
        </div>
      )}

      {!activeShift ? (
        <section className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-sm">
          <div className="h-1 bg-orange-500" />
          <div className="space-y-5 p-6 sm:p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
              <Vault className="h-7 w-7" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-black tracking-tight">
                Open a register shift
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-neutral-500">
                Enter the starting cash float to begin tracking sales and
                reconciling the drawer.
              </p>
            </div>
            <form onSubmit={handleOpenShift} className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-neutral-700">
                  Opening cash float (Rs.)
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={openingFloat}
                  onChange={(event) => setOpeningFloat(event.target.value)}
                  placeholder="e.g. 5000"
                  className="min-h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 text-sm font-semibold outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
                />
              </label>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
                Open cash drawer
              </button>
            </form>
          </div>
        </section>
      ) : (
        <>
          <section className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col justify-between gap-3 border-b border-neutral-100 pb-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-neutral-400">
                  Active cashier
                </p>
                <h2 className="mt-1 text-base font-black">
                  {activeShift.opened_by || 'Cashier'}
                </h2>
                <p className="mt-1 text-xs text-neutral-500">
                  Started{' '}
                  {activeShift.opened_at
                    ? new Date(activeShift.opened_at).toLocaleString([], {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })
                    : 'time unavailable'}
                </p>
              </div>
              <div className="rounded-xl bg-neutral-50 px-4 py-3 sm:text-right">
                <p className="text-xs font-semibold text-neutral-500">
                  Opening float
                </p>
                <p className="mt-1 font-mono text-lg font-black">
                  {money(activeShift.opening_cash)}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <SalesCard
                label="Cash sales"
                value={shiftReport?.totalCashSales ?? 0}
                icon={<DollarSign className="h-4 w-4" />}
                tone="emerald"
              />
              <SalesCard
                label="Card sales"
                value={shiftReport?.totalCardSales ?? 0}
                icon={<CreditCard className="h-4 w-4" />}
                tone="blue"
              />
              <SalesCard
                label="QR / digital sales"
                value={shiftReport?.totalQrSales ?? 0}
                icon={<QrCode className="h-4 w-4" />}
                tone="orange"
              />
            </div>

            <div className="mt-4 rounded-xl border border-orange-100 bg-orange-50/70 p-4">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-neutral-600">Opening float</span>
                <span className="font-mono font-bold">
                  {money(activeShift.opening_cash)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                <span className="text-neutral-600">Cash collected from orders</span>
                <span className="font-mono font-bold">
                  + {money(shiftReport?.totalCashSales ?? 0)}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 border-t border-orange-200 pt-3">
                <span className="text-sm font-extrabold">Expected drawer cash</span>
                <span className="font-mono text-lg font-black text-orange-700">
                  {money(expectedCash)}
                </span>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <section className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5">
                <h2 className="text-lg font-black">Close &amp; settle shift</h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Count the physical cash, review the difference, then confirm
                  settlement.
                </p>
              </div>

              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-neutral-700">
                  Counted cash in drawer (Rs.)
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={countedCash}
                  onChange={(event) => setCountedCash(event.target.value)}
                  placeholder="Enter physical cash total"
                  className="min-h-11 w-full rounded-xl border border-neutral-200 px-3.5 text-sm font-semibold outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100"
                />
              </label>

              <div className="mt-4 rounded-xl bg-neutral-50 p-4">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-neutral-500">Expected cash</span>
                  <span className="font-mono font-bold">{money(expectedCash)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                  <span className="text-neutral-500">Counted cash</span>
                  <span className="font-mono font-bold">
                    {countedCash.trim() === '' ? '—' : money(countedCash)}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-neutral-200 pt-3">
                  <span className="text-sm font-extrabold">Cash variance</span>
                  <span
                    className={`font-mono text-base font-black ${
                      variance === null
                        ? 'text-neutral-400'
                        : variance < 0
                          ? 'text-rose-600'
                          : variance > 0
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                    }`}
                  >
                    {variance === null ? '—' : `${variance > 0 ? '+' : ''}${money(variance)}`}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void handleCloseShift()}
                disabled={submitting || !countedCash.trim() || !reportReady}
                className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
                Close shift &amp; settle
              </button>
              {!reportReady && (
                <p className="mt-2 text-xs text-amber-700">
                  The shift report is still loading or could not be calculated.
                </p>
              )}
            </section>

            <section
              id="z-report-slip"
              className="rounded-2xl border border-neutral-200 bg-white p-5 font-mono text-xs text-neutral-800 shadow-sm sm:p-6"
            >
              <div className="border-b border-dashed border-neutral-300 pb-4 text-center">
                <p className="text-base font-black uppercase tracking-tight text-black">
                  End of shift Z-report
                </p>
                <p className="mt-1 text-[10px] text-neutral-500">
                  POS REGISTER · SETTLEMENT SLIP
                </p>
                <p className="mt-1 text-[10px] text-neutral-400">{reportTime}</p>
              </div>

              <div className="space-y-2 border-b border-dashed border-neutral-300 py-3">
                <ReportRow label="Cashier" value={activeShift.opened_by || 'Cashier'} />
                <ReportRow label="Shift ID" value={String(activeShift.id).slice(0, 8).toUpperCase()} />
                <ReportRow
                  label="Total orders"
                  value={`${shiftReport?.totalOrdersCount ?? 0} tickets`}
                />
              </div>

              <div className="space-y-2 border-b border-dashed border-neutral-300 py-3">
                <ReportRow label="Opening float" value={money(activeShift.opening_cash)} />
                <ReportRow label="Cash revenue" value={money(shiftReport?.totalCashSales ?? 0)} />
                <ReportRow label="Card revenue" value={money(shiftReport?.totalCardSales ?? 0)} />
                <ReportRow label="QR / digital revenue" value={money(shiftReport?.totalQrSales ?? 0)} />
                <ReportRow
                  label="Gross shift sales"
                  value={money(shiftReport?.totalGrossSales ?? 0)}
                  strong
                />
              </div>

              <div className="space-y-2 py-3">
                <ReportRow label="Expected drawer cash" value={money(expectedCash)} strong />
                <ReportRow
                  label="Counted drawer cash"
                  value={countedCash.trim() ? money(countedCash) : 'Not counted'}
                />
                {variance !== null && (
                  <ReportRow
                    label="Cash variance"
                    value={`${variance > 0 ? '+' : ''}${money(variance)}`}
                    strong
                  />
                )}
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                className="no-print mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 font-sans text-sm font-bold text-white transition hover:bg-neutral-700"
              >
                <Printer className="h-4 w-4" />
                Print Z-report
              </button>
            </section>
          </div>
        </>
      )}
    </main>
  );
}

function SalesCard({ label, value, icon, tone }) {
  const palette = {
    emerald: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-50 text-blue-700',
    orange: 'bg-orange-50 text-orange-700',
  }[tone];

  return (
    <article className="rounded-xl border border-neutral-200/80 bg-white p-4">
      <div className="flex items-center gap-2 text-neutral-500">
        <span className={`rounded-lg p-2 ${palette}`}>{icon}</span>
        <span className="text-xs font-bold">{label}</span>
      </div>
      <p className="mt-3 font-mono text-lg font-black tracking-tight text-neutral-950">
        {money(value)}
      </p>
    </article>
  );
}

function ReportRow({ label, value, strong = false }) {
  return (
    <div className={`flex items-start justify-between gap-4 ${strong ? 'font-black text-black' : ''}`}>
      <span className="min-w-0 flex-1">{label}</span>
      <span className="max-w-[58%] break-words text-right">{value}</span>
    </div>
  );
}
