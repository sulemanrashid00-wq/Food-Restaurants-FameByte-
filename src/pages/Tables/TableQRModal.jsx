import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Printer, Download, UtensilsCrossed } from 'lucide-react';

export default function TableQRModal({ table, onClose }) {
  if (!table) return null;

  // Real world URL for scanning (Fallback to window origin)
  const orderUrl = `${window.location.origin}/order/table/${table.table_number}`;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const svg = document.getElementById(`qr-svg-${table.id}`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 40;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 20, 20);
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `Table-${table.table_number}-QR.png`;
      downloadLink.href = `${pngFile}`;
      downloadLink.click();
    };
    img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #qr-printable-standee, #qr-printable-standee * {
            visibility: visible !important;
          }
          #qr-printable-standee {
            position: fixed !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 100mm !important;
            box-shadow: none !important;
            border: 2px solid #000 !important;
            padding: 20px !important;
            background: #fff !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-neutral-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="no-print flex items-center justify-between p-4 border-b border-neutral-100 bg-neutral-50/60">
          <span className="text-xs font-black uppercase text-neutral-600 tracking-wider">Table QR Standee</span>
          <button 
            onClick={onClose}
            className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/50 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Card Area */}
        <div id="qr-printable-standee" className="p-6 text-center space-y-4 bg-white">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-orange-500 text-white shadow-md shadow-orange-500/30 mx-auto">
            <UtensilsCrossed className="w-6 h-6" />
          </div>

          <div>
            <h3 className="text-lg font-black uppercase text-neutral-900 tracking-tight">DELICIOUS POS</h3>
            <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Contactless Digital Ordering</p>
          </div>

          {/* QR Code Container */}
          <div className="p-4 bg-neutral-50 border-2 border-dashed border-orange-200 rounded-3xl inline-block mx-auto shadow-inner">
            <QRCodeSVG
              id={`qr-svg-${table.id}`}
              value={orderUrl}
              size={180}
              level="H"
              includeMargin={false}
              fgColor="#171717"
            />
          </div>

          <div className="space-y-1">
            <div className="inline-block bg-neutral-900 text-white font-mono font-black text-sm px-4 py-1 rounded-full">
              TABLE {table.table_number}
            </div>
            <p className="text-[11px] font-bold text-neutral-600 mt-2">Scan with camera to browse menu & order</p>
            <p className="text-[9px] text-neutral-400 font-mono truncate px-4">{orderUrl}</p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="no-print p-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between gap-2">
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-white border border-neutral-200 rounded-2xl text-xs font-bold text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-neutral-500" />
            <span>PNG</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl text-xs font-extrabold shadow-md shadow-orange-500/20 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Standee</span>
          </button>
        </div>
      </div>
    </div>
  );
}