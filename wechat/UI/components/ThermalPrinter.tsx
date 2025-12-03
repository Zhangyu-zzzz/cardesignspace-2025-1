import { useState } from 'react';
import { Camera } from 'lucide-react';
import { ThermalReceipt } from './ThermalReceipt';

interface ThermalPrinterProps {
  onPrint: (message: string, images: string[]) => void;
}

export function ThermalPrinter({ onPrint }: ThermalPrinterProps) {
  const [message, setMessage] = useState('有一些美好，值得被记录\n你的生活\n你的仪式\n你的爱');
  const [images, setImages] = useState<string[]>([]);
  const [isPrinting, setIsPrinting] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newImages: string[] = [];
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newImages.push(reader.result as string);
        if (newImages.length === files.length) {
          setImages([...images, ...newImages]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      onPrint(message, images);
      setIsPrinting(false);
      setMessage('');
      setImages([]);
    }, 800);
  };

  return (
    <div className="px-4 pb-6">
      <div className="bg-[#f5f3ed] rounded-3xl shadow-2xl overflow-hidden">
        {/* Receipt Preview */}
        <div className="relative">
          <ThermalReceipt 
            message={message}
            images={images}
            number={Math.random().toString(36).substring(2, 8).toUpperCase()}
          />
        </div>

        {/* Printer Machine */}
        <div className="relative">
          {/* Tear Line Effect */}
          <div className="h-4 bg-[#f5f3ed] relative">
            <div className="absolute top-0 left-0 right-0 h-px bg-gray-300 border-t-2 border-dashed border-gray-400"></div>
            <div className="flex justify-center items-center">
              {Array.from({ length: 15 }).map((_, i) => (
                <div key={i} className="w-4 h-4">
                  <div className="w-3 h-3 rounded-full bg-[#e8e4d9] mx-auto mt-0.5"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Printer Body */}
          <div className="bg-gradient-to-b from-gray-900 to-black rounded-t-xl px-6 py-3 shadow-inner">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <div className="flex gap-1 tracking-[0.3em]" style={{ fontFamily: 'Courier New, monospace' }}>
                {'THERMAL'.split('').map((char, i) => (
                  <span key={i} className="text-white text-xs">{char}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Input Terminal */}
          <div className="bg-gradient-to-b from-black to-gray-900 px-6 pb-6">
            <div className="bg-[#1a1a1a] rounded-lg p-4 border border-gray-800 shadow-inner">
              <div className="flex items-start gap-2 mb-3">
                <span className="text-amber-500 mt-1" style={{ fontFamily: 'Courier New, monospace' }}>{'>'}</span>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="INPUT MESSAGE_"
                  className="flex-1 bg-transparent text-amber-600 outline-none resize-none h-24 placeholder-amber-800"
                  style={{ fontFamily: 'Courier New, monospace' }}
                />
              </div>
              
              {/* Image Preview */}
              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {images.map((img, idx) => (
                    <div key={idx} className="aspect-square rounded overflow-hidden">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-green-500 text-xs" style={{ fontFamily: 'Courier New, monospace' }}>
                  {isPrinting ? 'PRINTING...' : 'READY'}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Section with Buttons */}
          <div className="bg-gradient-to-b from-gray-900 to-[#d4cfc0] px-6 pb-8 pt-6 rounded-b-3xl">
            <div className="flex items-center justify-between">
              {/* Media Button */}
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 rounded-full bg-gray-300/50 flex items-center justify-center hover:bg-gray-300/70 transition-all">
                    <Camera className="w-6 h-6 text-gray-600" />
                  </div>
                  <span className="text-gray-500 text-xs tracking-wider" style={{ fontFamily: 'Courier New, monospace' }}>
                    MEDIA
                  </span>
                </div>
              </label>

              {/* Print Button */}
              <button
                onClick={handlePrint}
                disabled={isPrinting || (!message && images.length === 0)}
                className="relative group"
              >
                <div className={`w-24 h-24 rounded-full transition-all shadow-2xl ${
                  isPrinting || (!message && images.length === 0)
                    ? 'bg-gray-400' 
                    : 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                }`}>
                  <div className="absolute inset-0 rounded-full bg-gradient-to-t from-black/20 to-transparent"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white tracking-wider" style={{ fontFamily: 'Courier New, monospace' }}>
                      PRINT
                    </span>
                  </div>
                </div>
              </button>

              {/* Spacing */}
              <div className="w-14"></div>
            </div>

            <div className="text-center mt-4">
              <span className="text-gray-500 text-xs tracking-wide" style={{ fontFamily: 'Courier New, monospace' }}>
                MODEL: THERMAL-01
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
