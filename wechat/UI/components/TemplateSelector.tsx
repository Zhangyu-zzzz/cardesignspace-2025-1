import { X, Check } from 'lucide-react';

interface TemplateSelectorProps {
  selectedTemplate: string;
  onSelectTemplate: (template: string) => void;
  onClose: () => void;
}

export function TemplateSelector({ selectedTemplate, onSelectTemplate, onClose }: TemplateSelectorProps) {
  const templates = [
    {
      id: 'modern',
      name: '现代渐变',
      preview: 'bg-gradient-to-br from-purple-500 to-pink-500',
      description: '时尚渐变色彩',
    },
    {
      id: 'minimal',
      name: '简约白',
      preview: 'bg-white border-2 border-gray-200',
      description: '极简主义风格',
    },
    {
      id: 'vintage',
      name: '复古暖调',
      preview: 'bg-gradient-to-br from-amber-400 to-orange-500',
      description: '温暖怀旧感',
    },
    {
      id: 'elegant',
      name: '优雅黑',
      preview: 'bg-gradient-to-br from-slate-700 to-slate-900',
      description: '高级质感',
    },
    {
      id: 'fresh',
      name: '清新绿',
      preview: 'bg-gradient-to-br from-emerald-400 to-teal-500',
      description: '自然清新',
    },
    {
      id: 'sunset',
      name: '日落紫',
      preview: 'bg-gradient-to-br from-rose-400 to-purple-600',
      description: '浪漫梦幻',
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-gray-800">选择卡片样式</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-4">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => onSelectTemplate(template.id)}
                className="relative group"
              >
                <div className={`aspect-[3/4] rounded-xl ${template.preview} shadow-md group-hover:shadow-xl transition-all relative overflow-hidden`}>
                  {/* Selected Indicator */}
                  {selectedTemplate === template.id && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <div className="bg-white rounded-full p-2">
                        <Check className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                  )}
                  
                  {/* Template Preview Content */}
                  <div className="absolute inset-0 p-3 flex flex-col justify-end">
                    <div className={`w-full h-1/2 ${template.id === 'minimal' ? 'bg-gray-100' : 'bg-white/20'} rounded mb-2`}></div>
                    <div className={`h-2 ${template.id === 'minimal' ? 'bg-gray-300' : 'bg-white/40'} rounded mb-1`}></div>
                    <div className={`h-1.5 w-3/4 ${template.id === 'minimal' ? 'bg-gray-200' : 'bg-white/30'} rounded`}></div>
                  </div>
                </div>
                
                {/* Template Info */}
                <div className="mt-2 text-center">
                  <p className="text-gray-700 text-sm">{template.name}</p>
                  <p className="text-gray-400 text-xs">{template.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
