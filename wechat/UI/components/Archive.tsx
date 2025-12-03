import { ThermalCard } from '../App';

interface ArchiveProps {
  cards: ThermalCard[];
}

export function Archive({ cards }: ArchiveProps) {
  if (cards.length === 0) return null;

  return (
    <div className="px-4 pb-6">
      {/* Archive Header */}
      <div className="flex items-center gap-2 mb-4 px-2">
        <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z"/>
          <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd"/>
        </svg>
        <span className="text-gray-500 tracking-wider" style={{ fontFamily: 'Courier New, monospace' }}>
          ARCHIVE
        </span>
      </div>

      {/* Cards List */}
      <div className="space-y-4">
        {cards.map((card) => (
          <div key={card.id} className="bg-[#f5f3ed] rounded-2xl shadow-lg overflow-hidden">
            <div className="px-6 py-4">
              {/* Card Header */}
              <div className="flex items-start justify-between mb-3">
                <div style={{ fontFamily: 'Courier New, monospace' }}>
                  <div className="tracking-wider mb-1">THERMAL</div>
                  <div className="text-xs text-gray-600">NO: {card.number}</div>
                </div>
                
                <div className="text-right text-xs text-gray-600" style={{ fontFamily: 'Courier New, monospace' }}>
                  <div>{card.timestamp.toLocaleDateString('en-GB').replace(/\//g, '/')}</div>
                  <div>{card.timestamp.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>

              {/* Dotted Line */}
              <div className="border-t border-dashed border-gray-400 mb-3"></div>

              {/* Images */}
              {card.images.length > 0 && (
                <div className={`grid gap-2 ${card.images.length === 1 ? 'grid-cols-1' : card.images.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                  {card.images.map((img, idx) => (
                    <div key={idx} className="aspect-square rounded overflow-hidden bg-gray-200">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}

              {/* Message Preview */}
              {card.message && (
                <div className="mt-3 text-sm text-gray-700 line-clamp-3 whitespace-pre-line" style={{ fontFamily: 'Courier New, monospace' }}>
                  {card.message}
                </div>
              )}
            </div>

            {/* More Options */}
            <div className="px-6 pb-4">
              <button className="text-gray-400 hover:text-gray-600 text-xs" style={{ fontFamily: 'Courier New, monospace' }}>
                ···
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
