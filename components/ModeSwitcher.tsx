import React from 'react';
import { AppMode } from '../App';

interface ModeSwitcherProps {
  currentMode: AppMode;
  setMode: (mode: AppMode) => void;
  isLoading: boolean;
  isLocalChatActive: boolean;
}

const ModeSwitcher: React.FC<ModeSwitcherProps> = ({ currentMode, setMode, isLoading, isLocalChatActive }) => {
  const modes: { id: AppMode; label: string }[] = [
    { id: 'chat', label: 'Sembang' },
    { id: 'generate', label: 'Cipta Gambar' },
    { id: 'edit', label: 'Sunting Gambar' },
  ];

  const getButtonClasses = (mode: AppMode) => {
    const baseClasses = "px-4 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed";
    if (mode === currentMode) {
      return `${baseClasses} bg-blue-600 text-white`;
    }
    return `${baseClasses} bg-slate-700 text-slate-300 hover:bg-slate-600`;
  };

  return (
    <div className="flex justify-center p-2 bg-slate-800/50 rounded-lg space-x-2">
      {modes.map((mode) => {
        const isDisabled = isLoading || (isLocalChatActive && mode.id !== 'chat');
        return (
          <button
            key={mode.id}
            onClick={() => setMode(mode.id)}
            className={getButtonClasses(mode.id)}
            disabled={isDisabled}
            title={isDisabled && isLocalChatActive && mode.id !== 'chat' ? `Mod ini dinyahaktifkan apabila menggunakan model tempatan` : ''}
          >
            {mode.label}
          </button>
        );
      })}
    </div>
  );
};

export default ModeSwitcher;