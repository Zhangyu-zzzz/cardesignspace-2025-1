interface ThermalReceiptProps {
  message: string;
  images: string[];
  number: string;
  showTear?: boolean;
}

export function ThermalReceipt({ message, images, number, showTear = true }: ThermalReceiptProps) {
  const now = new Date();
  const date = now.toLocaleDateString('en-GB').replace(/\//g, '/');
  const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="bg-[#f5f3ed] px-8 pt-6 pb-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div style={{ fontFamily: 'Courier New, monospace' }}>
          <div className="tracking-wider mb-1">THERMAL</div>
          <div className="text-xs text-gray-600">NO: {number}</div>
        </div>
        
        {showTear && (
          <div className="border border-red-500 px-2 py-0.5 text-xs text-red-500" style={{ fontFamily: 'Courier New, monospace' }}>
            CLICK TO TEAR
          </div>
        )}
        
        <div className="text-right text-xs text-gray-600" style={{ fontFamily: 'Courier New, monospace' }}>
          <div>{date}</div>
          <div>{time}</div>
        </div>
      </div>

      {/* Dotted Line */}
      <div className="border-t border-dashed border-gray-400 mb-4"></div>

      {/* Message Content */}
      {message && (
        <div className="mb-6 whitespace-pre-line leading-relaxed" style={{ fontFamily: 'Courier New, monospace' }}>
          {message}
        </div>
      )}

      {/* Images */}
      {images.length > 0 && (
        <div className={`grid gap-2 mb-6 ${images.length === 1 ? 'grid-cols-1' : images.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {images.map((img, idx) => (
            <div key={idx} className="aspect-square rounded overflow-hidden bg-gray-200">
              <img src={img} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}

      {/* Divider Line */}
      <div className="border-t border-gray-800 mb-4"></div>

      {/* QR Code and Info */}
      <div className="flex items-center justify-between mb-4">
        <div className="w-16 h-16">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Simplified QR code pattern */}
            <rect x="0" y="0" width="100" height="100" fill="white"/>
            {Array.from({ length: 10 }).map((_, row) => 
              Array.from({ length: 10 }).map((_, col) => 
                Math.random() > 0.5 ? (
                  <rect 
                    key={`${row}-${col}`}
                    x={col * 10} 
                    y={row * 10} 
                    width="10" 
                    height="10" 
                    fill="black"
                  />
                ) : null
              )
            )}
          </svg>
        </div>
        
        <div className="text-right text-xs text-gray-500" style={{ fontFamily: 'Courier New, monospace' }}>
          <div>SCAN ME</div>
          <div>#{number}</div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-400 border-t border-dashed border-gray-300 pt-3" style={{ fontFamily: 'Courier New, monospace' }}>
        --- TEAR HERE ---
      </div>

      {/* Perforation Effect */}
      {showTear && (
        <div className="flex justify-center mt-2">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-300 mx-0.5"></div>
          ))}
        </div>
      )}
    </div>
  );
}
