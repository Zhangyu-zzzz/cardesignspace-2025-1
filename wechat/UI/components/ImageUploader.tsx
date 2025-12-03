import { Upload, Image as ImageIcon } from 'lucide-react';

interface ImageUploaderProps {
  onImageUpload: (imageUrl: string) => void;
}

export function ImageUploader({ onImageUpload }: ImageUploaderProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageUpload(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center">
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full mb-4">
            <ImageIcon className="w-10 h-10 text-purple-500" />
          </div>
          <h2 className="text-gray-700 mb-2">开始制作你的卡片</h2>
          <p className="text-gray-400 text-sm">上传一张图片开始编辑</p>
        </div>

        <label className="block cursor-pointer">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="border-2 border-dashed border-purple-300 rounded-2xl p-8 text-center hover:border-purple-500 hover:bg-purple-50 transition-all">
            <Upload className="w-12 h-12 text-purple-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-1">点击上传图片</p>
            <p className="text-gray-400 text-xs">支持 JPG、PNG 格式</p>
          </div>
        </label>

        {/* Example Templates Preview */}
        <div className="mt-8">
          <p className="text-gray-500 text-sm mb-3 text-center">精选模板样式</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="aspect-square bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl shadow-md"></div>
            <div className="aspect-square bg-gradient-to-br from-pink-400 to-rose-600 rounded-xl shadow-md"></div>
            <div className="aspect-square bg-gradient-to-br from-amber-400 to-orange-600 rounded-xl shadow-md"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
