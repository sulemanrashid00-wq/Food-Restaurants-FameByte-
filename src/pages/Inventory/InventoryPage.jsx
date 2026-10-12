import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Minus,
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  XCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const DEFAULT_LOW_STOCK_THRESHOLD = 10;

function getStock(item) {
  return Math.max(0, Number(item.stock_quantity ?? 0) || 0);
}

function getThreshold(item) {
  return Math.max(
    0,
    Number(item.low_stock_threshold ?? DEFAULT_LOW_STOCK_THRESHOLD) ||
      DEFAULT_LOW_STOCK_THRESHOLD,
  );
}

function formatPrice(value) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount)
    ? `Rs. ${amount.toLocaleString('en-PK', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : '—';
}

export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [updatingId, setUpdatingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [restockItem, setRestockItem] = useState(null);
  const [restockAmount, setRestockAmount] = useState('25');

  const fetchInventory = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setErrorMessage('');

    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setItems(data ?? []);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to load inventory.';
      setErrorMessage(message);
      console.error('Inventory fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchInventory();

    const channel = supabase
      .channel('inventory-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'menu_items' },
        () => {
          void fetchInventory(true);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchInventory]);

  const updateStock = async (
    item,
    nextStock,
  ) => {
    const safeStock = Math.max(0, Math.floor(nextStock));
    setUpdatingId(item.id);
    setErrorMessage('');

    try {
      const { data, error } = await supabase
        .from('menu_items')
        .update({
          stock_quantity: safeStock,
          is_available: safeStock > 0,
        })
        .eq('id', item.id)
        .select('*')
        .single();

      if (error) throw error;

      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id ? data : entry,
        ),
      );
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to update stock.';
      setErrorMessage(message);
      console.error('Stock update error:', error);
      return false;
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStockDelta = async (
    item,
    delta,
  ) => {
    const currentStock = getStock(item);
    const nextStock = Math.max(0, currentStock + delta);
    if (nextStock === currentStock) return;
    await updateStock(item, nextStock);
  };

  const handleRestock = async () => {
    if (!restockItem) return;

    const amount = Number(restockAmount);
    if (!Number.isInteger(amount) || amount <= 0) {
      setErrorMessage('Enter a whole number greater than zero for restocking.');
      return;
    }

    const success = await updateStock(
      restockItem,
      getStock(restockItem) + amount,
    );

    if (success) {
      setRestockItem(null);
      setRestockAmount('25');
    }
  };

  const outOfStockItems = useMemo(
    () => items.filter((item) => getStock(item) <= 0),
    [items],
  );

  const lowStockItems = useMemo(
    () =>
      items.filter((item) => {
        const stock = getStock(item);
        return stock > 0 && stock <= getThreshold(item);
      }),
    [items],
  );

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();

    return items.filter((item) => {
      const stock = getStock(item);
      const threshold = getThreshold(item);

      if (filter === 'LowStock' && !(stock > 0 && stock <= threshold)) {
        return false;
      }
      if (filter === 'OutOfStock' && stock > 0) return false;

      if (!query) return true;

      return (
        item.name?.toLocaleLowerCase().includes(query) ||
        item.category?.toLocaleLowerCase().includes(query)
      );
    });
  }, [items, filter, searchQuery]);

  const filterTabs = [
    { id: 'All', label: 'All items', count: items.length },
    { id: 'LowStock', label: 'Low stock', count: lowStockItems.length },
    { id: 'OutOfStock', label: 'Out of stock', count: outOfStockItems.length },
  ];

  return (
    <main className="min-h-full space-y-6 bg-neutral-50/60 px-4 py-5 text-neutral-900 sm:px-6 lg:px-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Stock &amp; Inventory
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Live sync
            </span>
          </div>
          <p className="mt-1.5 max-w-2xl text-sm text-neutral-500">
            Monitor stock levels, spot low inventory, and update quantities in
            one place.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void fetchInventory(true)}
          disabled={refreshing}
          className="inline-flex min-h-10 w-fit items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-bold text-neutral-700 shadow-sm transition hover:border-neutral-300 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
          />
          {refreshing ? 'Refreshing…' : 'Refresh inventory'}
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
              <p className="font-bold">Something needs attention</p>
              <p className="mt-0.5 break-words text-rose-700">
                {errorMessage}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Dismiss error"
            onClick={() => setErrorMessage('')}
            className="rounded-lg p-1 hover:bg-rose-100"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      <section
        aria-label="Inventory overview"
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        <MetricCard
          label="Total menu items"
          value={items.length}
          helper="Items tracked in inventory"
          icon={<PackageCheck className="h-5 w-5" />}
          tone="neutral"
        />
        <MetricCard
          label="Low stock"
          value={lowStockItems.length}
          helper="Items at or below their threshold"
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="amber"
        />
        <MetricCard
          label="Out of stock"
          value={outOfStockItems.length}
          helper="Items with zero remaining"
          icon={<XCircle className="h-5 w-5" />}
          tone="rose"
        />
      </section>

      <section className="space-y-4 rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Filter inventory"
          >
            {filterTabs.map((tab) => {
              const active = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilter(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                    active
                      ? 'bg-neutral-900 text-white shadow-sm'
                      : 'border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  {tab.label}
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] ${
                      active
                        ? 'bg-white/15 text-white'
                        : 'bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <label className="relative block w-full lg:max-w-xs">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search name or category…"
              className="min-h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2 pl-10 pr-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white focus:ring-2 focus:ring-neutral-100"
            />
          </label>
        </div>

        <div className="overflow-hidden rounded-xl border border-neutral-200">
          {loading ? (
            <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-sm text-neutral-500">
              <Loader2 className="h-7 w-7 animate-spin text-neutral-700" />
              Loading inventory…
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
              <div className="mb-3 rounded-2xl bg-neutral-100 p-3 text-neutral-500">
                <PackageCheck className="h-6 w-6" />
              </div>
              <p className="font-bold text-neutral-800">
                {items.length === 0
                  ? 'Your inventory is empty'
                  : 'No matching items'}
              </p>
              <p className="mt-1 text-sm text-neutral-500">
                {items.length === 0
                  ? 'Items from your menu will appear here.'
                  : 'Try another search or switch to a different filter.'}
              </p>
              {(searchQuery || filter !== 'All') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setFilter('All');
                  }}
                  className="mt-3 text-sm font-bold text-neutral-800 underline underline-offset-4"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 text-[10px] font-extrabold uppercase tracking-[0.12em] text-neutral-500">
                    <th scope="col" className="px-5 py-3.5">Item</th>
                    <th scope="col" className="px-4 py-3.5">Category</th>
                    <th scope="col" className="px-4 py-3.5">Status</th>
                    <th scope="col" className="px-4 py-3.5 text-center">
                      Stock
                    </th>
                    <th scope="col" className="px-5 py-3.5 text-right">
                      Manage stock
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredItems.map((item) => {
                    const stock = getStock(item);
                    const threshold = getThreshold(item);
                    const isOut = stock <= 0;
                    const isLow = !isOut && stock <= threshold;
                    const isUpdating = updatingId === item.id;

                    return (
                      <tr
                        key={item.id}
                        className="transition hover:bg-neutral-50/80"
                      >
                        <td className="px-5 py-4">
                          <p className="font-bold text-neutral-900">
                            {item.name || 'Unnamed item'}
                          </p>
                          <p className="mt-1 text-xs text-neutral-500">
                            {formatPrice(item.price)}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-neutral-600">
                          {item.category || 'General'}
                        </td>
                        <td className="px-4 py-4">
                          <StockStatus
                            status={isOut ? 'out' : isLow ? 'low' : 'healthy'}
                            threshold={threshold}
                          />
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span
                            className={`font-mono text-base font-extrabold ${
                              isOut
                                ? 'text-rose-600'
                                : isLow
                                  ? 'text-amber-600'
                                  : 'text-neutral-900'
                            }`}
                          >
                            {stock}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-neutral-400">
                            {item.unit || 'portions'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <div className="inline-flex items-center rounded-xl border border-neutral-200 bg-white p-1">
                              <button
                                type="button"
                                aria-label={`Decrease ${item.name} stock`}
                                disabled={isUpdating || stock <= 0}
                                onClick={() => void handleStockDelta(item, -1)}
                                className="rounded-lg p-2 text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950 disabled:cursor-not-allowed disabled:opacity-30"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="min-w-7 text-center font-mono text-xs font-bold">
                                {isUpdating ? (
                                  <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  stock
                                )}
                              </span>
                              <button
                                type="button"
                                aria-label={`Increase ${item.name} stock`}
                                disabled={isUpdating}
                                onClick={() => void handleStockDelta(item, 1)}
                                className="rounded-lg p-2 text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950 disabled:cursor-not-allowed disabled:opacity-30"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => {
                                setRestockItem(item);
                                setRestockAmount('25');
                                setErrorMessage('');
                              }}
                              className="rounded-xl bg-neutral-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Restock
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!loading && filteredItems.length > 0 && (
          <p className="text-xs text-neutral-500">
            Showing <span className="font-bold text-neutral-700">{filteredItems.length}</span>{' '}
            of <span className="font-bold text-neutral-700">{items.length}</span>{' '}
            items
          </p>
        )}
      </section>

      {restockItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/40 p-4 backdrop-blur-[2px]"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && updatingId === null) {
              setRestockItem(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="restock-title"
            className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="restock-title" className="text-lg font-extrabold">
                  Restock item
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Add stock for <span className="font-bold text-neutral-800">{restockItem.name}</span>.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close restock dialog"
                disabled={updatingId !== null}
                onClick={() => setRestockItem(null)}
                className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 disabled:opacity-50"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form
              className="mt-5 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void handleRestock();
              }}
            >
              <div className="rounded-xl bg-neutral-50 p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-neutral-500">Current stock</span>
                  <span className="font-mono font-bold">{getStock(restockItem)}</span>
                </div>
              </div>
              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-neutral-700">
                  Quantity to add
                </span>
                <input
                  autoFocus
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={restockAmount}
                  onChange={(event) => setRestockAmount(event.target.value)}
                  className="min-h-11 w-full rounded-xl border border-neutral-200 px-3.5 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100"
                />
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={updatingId !== null}
                  onClick={() => setRestockItem(null)}
                  className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-bold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingId !== null}
                  className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {updatingId !== null && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Confirm restock
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

function MetricCard({ label, value, helper, icon, tone }) {
  const styles = {
    neutral: {
      icon: 'bg-neutral-100 text-neutral-700',
      value: 'text-neutral-950',
      accent: 'bg-neutral-900',
    },
    amber: {
      icon: 'bg-amber-50 text-amber-700',
      value: 'text-amber-700',
      accent: 'bg-amber-500',
    },
    rose: {
      icon: 'bg-rose-50 text-rose-700',
      value: 'text-rose-700',
      accent: 'bg-rose-500',
    },
  }[tone];

  return (
    <article className="relative overflow-hidden rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm">
      <div className={`absolute inset-x-0 top-0 h-0.5 ${styles.accent}`} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-neutral-500">{label}</p>
          <p className={`mt-2 text-3xl font-black tracking-tight ${styles.value}`}>
            {value}
          </p>
          <p className="mt-1.5 text-xs text-neutral-500">{helper}</p>
        </div>
        <div className={`rounded-xl p-3 ${styles.icon}`}>{icon}</div>
      </div>
    </article>
  );
}

function StockStatus({ status, threshold }) {
  if (status === 'out') {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-extrabold text-rose-700">
        <XCircle className="h-3 w-3" />
        Out of stock
      </span>
    );
  }

  if (status === 'low') {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold text-amber-800">
        <AlertTriangle className="h-3 w-3" />
        Low (≤ {threshold})
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold text-emerald-700">
      <CheckCircle2 className="h-3 w-3" />
      Healthy
    </span>
  );
}
