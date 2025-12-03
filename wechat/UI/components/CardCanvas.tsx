import { forwardRef } from 'react';

interface CardCanvasProps {
  image: string;
  template: string;
  text: string;
  subText: string;
}

export const CardCanvas = forwardRef<HTMLDivElement, CardCanvasProps>(
  ({ image, template, text, subText }, ref) => {
    const templates = {
      modern: {
        bg: 'bg-gradient-to-br from-purple-500 to-pink-500',
        textColor: 'text-white',
        overlay: 'bg-black/20',
      },
      minimal: {
        bg: 'bg-white',
        textColor: 'text-gray-800',
        overlay: 'bg-white/80',
      },
      vintage: {
        bg: 'bg-gradient-to-br from-amber-400 to-orange-500',
        textColor: 'text-white',
        overlay: 'bg-gradient-to-t from-amber-900/60 to-transparent',
      },
      elegant: {
        bg: 'bg-gradient-to-br from-slate-700 to-slate-900',
        textColor: 'text-white',
        overlay: 'bg-black/40',
      },
      fresh: {
        bg: 'bg-gradient-to-br from-emerald-400 to-teal-500',
        textColor: 'text-white',
        overlay: 'bg-gradient-to-t from-emerald-900/50 to-transparent',
      },
      sunset: {
        bg: 'bg-gradient-to-br from-rose-400 to-purple-600',
        textColor: 'text-white',
        overlay: 'bg-gradient-to-t from-purple-900/60 to-transparent',
      },
    };

    const currentTemplate = templates[template as keyof typeof templates] || templates.modern;

    return (
      <div ref={ref} className="aspect-[3/4] relative overflow-hidden rounded-xl">
        {/* Background */}
        <div className={`absolute inset-0 ${currentTemplate.bg}`}></div>

        {/* Image */}
        <div className="absolute inset-0 p-6">
          <div className="w-full h-3/5 rounded-xl overflow-hidden shadow-2xl">
            <img 
              src={image} 
              alt="Uploaded" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Overlay */}
        <div className={`absolute inset-0 ${currentTemplate.overlay}`}></div>

        {/* Text Content */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="space-y-2">
            {text && (
              <h2 className={`${currentTemplate.textColor} tracking-wide drop-shadow-lg`}>
                {text}
              </h2>
            )}
            {subText && (
              <p className={`${currentTemplate.textColor} opacity-90 text-sm drop-shadow-md`}>
                {subText}
              </p>
            )}
            <div className="pt-4 flex items-center gap-2">
              <div className={`w-8 h-0.5 ${currentTemplate.textColor} opacity-50`}></div>
              <p className={`${currentTemplate.textColor} opacity-70 text-xs`}>
                {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
        </div>

        {/* Decorative Elements based on template */}
        {template === 'minimal' && (
          <div className="absolute top-6 left-6 w-16 h-16 border-l-2 border-t-2 border-gray-300"></div>
        )}
        {template === 'elegant' && (
          <>
            <div className="absolute top-6 right-6 w-12 h-12 border border-white/30 rounded-full"></div>
            <div className="absolute top-10 right-10 w-6 h-6 border border-white/20 rounded-full"></div>
          </>
        )}
      </div>
    );
  }
);

CardCanvas.displayName = 'CardCanvas';
