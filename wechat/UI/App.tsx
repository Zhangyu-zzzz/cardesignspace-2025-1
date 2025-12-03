import { useState } from 'react';
import { ThermalPrinter } from './components/ThermalPrinter';
import { Archive } from './components/Archive';

export interface ThermalCard {
  id: string;
  number: string;
  message: string;
  images: string[];
  timestamp: Date;
}

export default function App() {
  const [cards, setCards] = useState<ThermalCard[]>([]);

  const handlePrint = (message: string, images: string[]) => {
    const newCard: ThermalCard = {
      id: Date.now().toString(),
      number: Math.random().toString(36).substring(2, 8).toUpperCase(),
      message,
      images,
      timestamp: new Date(),
    };
    setCards([newCard, ...cards]);
  };

  return (
    <div className="min-h-screen bg-[#e8e4d9]">
      <div className="max-w-md mx-auto min-h-screen">
        {/* Status Bar */}
        <div className="flex items-center justify-between px-4 py-3 text-sm">
          <div className="flex items-center gap-2">
            <span>←</span>
            <span>App Store</span>
          </div>
          <span>23:28</span>
          <div className="flex items-center gap-1">
            <span>📶</span>
            <span>📡</span>
            <span>🔋</span>
          </div>
        </div>

        {/* Main Printer Section */}
        <ThermalPrinter onPrint={handlePrint} />

        {/* Archive Section */}
        <Archive cards={cards} />
      </div>
    </div>
  );
}
