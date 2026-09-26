import { X, Printer, CheckCircle2 } from 'lucide-react';

export default function ReceiptModal({ order, onClose }) {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const taxRate = 0.05; // 5% GST/Tax (Adjust according to your needs)
  const subtotal = Number(order.total_amount || 0);
  const taxAmount = subtotal * taxRate;
  const netTotal = subtotal + taxAmount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      {/* Modal Box */}
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-neutral-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header - Screen Only */}
        <div className="print:hidden flex items-center justify-between p-4 border-b border-neutral-100 bg-neutral-50/50">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <h3 className="text-xs font-black text-neutral-800 uppercase tracking-wider">POS Thermal Invoice</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-200/60 text-neutral-500 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Receipt Body */}
        <div className="p-6 text-neutral-900 font-mono text-xs space-y-4" id="printable-receipt">
          
          {/* Restaurant Branding Header */}
          <div className="text-center space-y-1">
            <h2 className="text-xl font-black tracking-tight text-black uppercase">RESTAURANT POS</h2>
            <p className="text-[10px] text-neutral-500">Main Commercial Hub, City Center</p>
            <p className="text-[10px] text-neutral-500">Tel: +92 300 1234567</p>
            <div className="border-b border-dashed border-neutral-400 my-2"></div>
          </div>

          {/* Invoice Metadata */}
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-neutral-500">Order ID:</span>
              <span className="font-bold">#{order.id?.slice(0, 8).toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Date:</span>
              <span>{new Date(order.created_at || Date.now()).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Customer:</span>
              <span className="font-bold">{order.customer_name || 'Walk-in Guest'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Type / Table:</span>
              <span className="font-bold bg-neutral-100 px-1.5 rounded">
                {order.tables?.table_number ? `Table ${order.tables.table_number}` : 'Takeaway / Delivery'}
              </span>
            </div>
          </div>

          <div className="border-b border-dashed border-neutral-400 my-2"></div>

          {/* Order Items Table */}
          <div className="space-y-2">
            <div className="grid grid-cols-12 font-bold text-[10px] text-neutral-500 uppercase border-b border-neutral-200 pb-1">
              <span className="col-span-6">Item</span>
              <span className="col-span-2 text-center">Qty</span>
              <span className="col-span-4 text-right">Amount</span>
            </div>

            {order.order_items && order.order_items.length > 0 ? (
              order.order_items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 text-[11px] items-center">
                  <span className="col-span-6 font-medium line-clamp-1">
                    {item.menu_items?.name || item.name || 'Menu Item'}
                  </span>
                  <span className="col-span-2 text-center font-bold">x{item.quantity}</span>
                  <span className="col-span-4 text-right font-bold">
                    Rs. {Number(item.subtotal || (item.quantity * item.price) || 0).toFixed(2)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-[10px] text-neutral-400 text-center py-2">Item details attached to ticket</p>
            )}
          </div>

          <div className="border-b border-dashed border-neutral-400 my-2"></div>

          {/* Financial Calculation Summary */}
          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-neutral-500">Subtotal:</span>
              <span>Rs. {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">GST (5%):</span>
              <span>Rs. {taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-black pt-1 border-t border-neutral-300">
              <span>NET TOTAL:</span>
              <span className="font-mono">Rs. {netTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="border-b border-dashed border-neutral-400 my-2"></div>

          {/* Footer Note */}
          <div className="text-center space-y-1 pt-1">
            <p className="text-[10px] font-bold uppercase tracking-wider">*** Thank You For Dining With Us! ***</p>
            <p className="text-[9px] text-neutral-400">Software Powered by POS Suite</p>
          </div>

        </div>

        {/* Action Controls - Screen Only */}
        <div className="print:hidden p-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-200/60 transition cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-xl text-xs font-extrabold shadow-md hover:shadow-lg transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Thermal Receipt</span>
          </button>
        </div>

      </div>

      {/* CSS Styling to hide background elements during Window Print */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-receipt, #printable-receipt * {
            visibility: visible;
          }
          #printable-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            padding: 10px;
          }
        }
      `}</style>
    </div>
  );
}