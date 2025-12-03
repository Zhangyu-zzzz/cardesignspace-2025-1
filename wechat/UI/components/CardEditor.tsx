import { useState, useRef } from 'react';
import { Download, RefreshCw, Type, Sticker } from 'lucide-react';
import { CardCanvas } from './CardCanvas';

interface CardEditorProps {
  image: string;
  template: string;
  onChangeImage: () => void;
}

export function CardEditor({ image, template, onChangeImage }: CardEditorProps) {
  const [text, setText] = useState('分享美好时光');
  const [subText, setSubText] = useState('');
  const [showTextEditor, setShowTextEditor] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    // In a real app, this would generate and download the card image
    alert('在实际小程序中，这里会保存图片到相册');
  };

  return (
    <div className="space-y-4">
      {/* Canvas Preview */}
      <div className="bg-white rounded-2xl shadow-xl p-4">
        <CardCanvas 
          ref={canvasRef}
          image={image}
          template={template}
          text={text}
          subText={subText}
        />
      </div>

      {/* Text Editor Toggle */}
      {showTextEditor && (
        <div className="bg-white rounded-2xl shadow-lg p-4 space-y-3">
          <div>
            <label className="block text-gray-600 text-sm mb-2">主标题</label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="输入主标题"
            />
          </div>
          <div>
            <label className="block text-gray-600 text-sm mb-2">副标题（可选）</label>
            <input
              type="text"
              value={subText}
              onChange={(e) => setSubText(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="输入副标题"
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={onChangeImage}
          className="bg-white rounded-xl shadow-md p-4 flex flex-col items-center justify-center hover:shadow-lg transition-all"
        >
          <RefreshCw className="w-6 h-6 text-gray-600 mb-1" />
          <span className="text-xs text-gray-600">换图片</span>
        </button>
        
        <button
          onClick={() => setShowTextEditor(!showTextEditor)}
          className="bg-white rounded-xl shadow-md p-4 flex flex-col items-center justify-center hover:shadow-lg transition-all"
        >
          <Type className="w-6 h-6 text-gray-600 mb-1" />
          <span className="text-xs text-gray-600">编辑文字</span>
        </button>
        
        <button
          onClick={handleDownload}
          className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl shadow-md p-4 flex flex-col items-center justify-center hover:shadow-lg transition-all"
        >
          <Download className="w-6 h-6 mb-1" />
          <span className="text-xs">保存</span>
        </button>
      </div>
    </div>
  );
}
