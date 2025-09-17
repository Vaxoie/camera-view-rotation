import React, { useState } from 'react';
import { InfoIcon, CloseIcon } from './Icons';

interface GridCellProps {
  children: React.ReactNode;
  prompt?: string;
}

export const GridCell: React.FC<GridCellProps> = ({ children, prompt }) => {
  const [isPromptVisible, setIsPromptVisible] = useState(false);

  return (
    <div className="relative aspect-square bg-gray-800/50 rounded-lg overflow-hidden flex items-center justify-center border border-gray-700/50">
      {children}
      {prompt && (
        <>
          <button
            onClick={() => setIsPromptVisible(true)}
            className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white hover:bg-black/75 transition-colors z-10"
            aria-label="Show prompt"
          >
            <InfoIcon className="w-4 h-4" />
          </button>

          {isPromptVisible && (
            <div
              className="absolute inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 z-20 animate-fade-in"
              onClick={() => setIsPromptVisible(false)}
            >
              <div
                className="bg-gray-800 p-5 rounded-lg max-w-full max-h-full overflow-y-auto text-sm text-gray-300 relative shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h4 className="font-bold text-white mb-2 uppercase tracking-wider">Generation Prompt</h4>
                <p style={{ whiteSpace: 'pre-wrap' }}>{prompt}</p>
                 <button
                    onClick={() => setIsPromptVisible(false)}
                    className="absolute top-2 right-2 p-1 text-gray-400 hover:text-white"
                    aria-label="Close prompt"
                  >
                    <CloseIcon className="w-5 h-5" />
                 </button>
              </div>
            </div>
          )}
        </>
      )}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-in-out;
        }
      `}</style>
    </div>
  );
};
