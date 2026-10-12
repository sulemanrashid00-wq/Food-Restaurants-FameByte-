import React, { useRef } from 'react';
import { Printer, X, CheckCircle, Split } from 'lucide-react';

export default function ThermalReceiptModal({ order, isOpen, onClose, onSettlePayment }) {
  const receiptRef = useRef();

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    const printContent = receiptRef.current.innerHTML;
    const printWindow = window.open('', '', 'width=400,height=600');
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt #${order.id.slice(0, 6)}</title>
          <style>
            @page { margin: 0; }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              width: 80mm; 
              margin: 0; 
              padding: 12px;
              font-size: 12px;
              color: #000;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .item-row { display: flex; justify-content: space-between; margin: 4px 0; }
            .bold { font-weight: bold; }
          </style>
        </head>
        <body>
          ${printContent}
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const subtotal = order.order_items?.reduce((acc, it) => acc + (Number(it.subtotal) || (Number(it.unit_price) * it.quantity)), 0) || Number(order.total_amount);
  const tax = subtotal * 0.05;
  const grandTotal = subtotal + tax;

  return (
    <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-neutral-100 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <h3 className="text-sm font-black text-neutral-900 flex items-center gap-2">
            <Printer className="w-4 h-4 text-orange-500" /> Print Guest Receipt
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-neutral-100 text-neutral-400 hover:text-neutral-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 80mm Thermal Receipt Preview Container */}
        <div className="overflow-y-auto my-4 border border-dashed border-neutral-200 p-4 rounded-2xl bg-neutral-50/50">
          <div ref={receiptRef} className="font-mono text-xs text-neutral-800 space-y-2">
            <div className="text-center space-y-1">
              <h2 className="text-base font-black tracking-widest uppercase">DELICIOUS POS</h2>
              <p className="text-[10px] text-neutral-500">FameByte Gourmet Restaurant</p>
              <p className="text-[9px] text-neutral-400">Tel: +92 300 0000000 | Karachi, PK</p>
            </div>

            <div className="border-t border-dashed border-neutral-300 my-2" />

            <div className="flex justify-between text-[10px] text-neutral-500">
              <span>Order: #{order.id.slice(0, 6).toUpperCase()}</span>
              <span>{order.tables?.table_number ? `Table ${order.tables.table_number}` : 'Takeaway'}</span>
            </div>
            <div className="flex justify-between text-[10px] text-neutral-500">
              <span>Date: {new Date(order.created_at).toLocaleDateString()}</span>
              <span>Time: {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>

            <div className="border-t border-dashed border-neutral-300 my-2" />

            {/* Line Items */}
            <div className="space-y-1.5">
              {order.order_items?.map((item) => (
                <div key={item.id} className="flex justify-between items-center text-[11px]">
                  <span className="font-medium truncate max-w-[160px]">
                    {item.quantity}x {item.menu_items?.name || 'Dish'}
                  </span>
                  <span className="font-bold">
                    Rs. {(item.subtotal || item.unit_price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-neutral-300 my-2" />

            {/* Calculations */}
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between text-neutral-500">
                <span>Subtotal</span>
                <span>Rs. {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-neutral-500">
                <span>GST / Tax (5%)</span>
                <span>Rs. {tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-black pt-1 border-t border-neutral-200">
                <span>TOTAL DUE</span>
                <span className="text-orange-600">Rs. {grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-neutral-300 my-2" />

            <div className="text-center text-[10px] text-neutral-400 space-y-0.5">
              <p>Thank you for dining with us!</p>
              <p>Wi-Fi: Delicious-Guest / Pass: vipguest2026</p>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="space-y-2 pt-2">
          <button
            onClick={handlePrint}
            className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md transition"
          >
            <Printer className="w-4 h-4" /> Print Receipt (ESC/POS)
          </button>

          {onSettlePayment && order.payment_status !== 'Paid' && (
            <button
              onClick={() => onSettlePayment(order.id, grandTotal)}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md transition"
            >
              <CheckCircle className="w-4 h-4" /> Settle & Close Bill (Cash)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}