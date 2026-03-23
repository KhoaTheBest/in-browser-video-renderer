import React, { useState, useEffect } from 'react';
import { BrowserSupport } from './components/BrowserSupport';
import { RenderBlock } from './components/RenderBlock';

const App: React.FC = () => {
  const [blocks, setBlocks] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('render-poc-blocks');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse blocks from localStorage', e);
    }
    return [Date.now()];
  });

  useEffect(() => {
    localStorage.setItem('render-poc-blocks', JSON.stringify(blocks));
  }, [blocks]);

  const handleAddBlock = () => {
    setBlocks([...blocks, Date.now()]);
  };

  return (
    <div className="min-h-screen p-8 text-slate-200 font-sans">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white tracking-wide">
            Render in Browser
          </h1>
        </header>

        <div className="mb-6 max-w-3xl mx-auto">
          <BrowserSupport />
        </div>

        <div className="flex flex-col gap-12">
          {blocks.map((id) => (
            <RenderBlock key={id} blockId={id.toString()} />
          ))}

          <div className="flex justify-center mt-4">
            <button
              onClick={handleAddBlock}
              className="border-2 border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white font-medium px-24 py-4 rounded transition tracking-wider w-full max-w-md"
            >
              + ADD NEW
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
