import React, { useState, useRef, KeyboardEvent } from 'react';
import { SendIcon, CameraIcon, Trash2Icon } from './icons';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  onOpenCamera: () => void;
  pendingImageUrl?: string | null;
  onRemovePendingImage: () => void;
  isLocalMode?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading, onOpenCamera, pendingImageUrl, onRemovePendingImage, isLocalMode }) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if ((text.trim() || pendingImageUrl) && !isLoading) {
      onSendMessage(text);
      setText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'; // Reset height after sending
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${e.target.scrollHeight}px`;
    }
  };

  return (
    <div>
        {pendingImageUrl && (
            <div className="mb-2 p-2 bg-slate-700/50 rounded-lg flex items-center gap-3">
                <img src={pendingImageUrl} alt="Pending" className="w-16 h-16 object-cover rounded-md" />
                <div className="text-sm text-slate-300 flex-1">Imej sedia untuk dihantar.</div>
                 <button
                    onClick={onRemovePendingImage}
                    className="p-1.5 rounded-full bg-slate-600 text-slate-200 hover:bg-red-500"
                    aria-label="Remove image"
                 >
                     <Trash2Icon className="h-4 w-4" />
                 </button>
            </div>
        )}
        <div className="flex items-end gap-3 bg-slate-800 border border-slate-600 rounded-xl p-2">
          <button
            onClick={onOpenCamera}
            disabled={isLoading || isLocalMode}
            className="flex-shrink-0 h-10 w-10 rounded-full text-slate-400 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:text-slate-200"
            aria-label="Guna Kamera"
            title={isLocalMode ? "Kamera dinyahaktifkan dalam mod tempatan" : "Guna Kamera"}
          >
            <CameraIcon className="h-5 w-5" />
          </button>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Tanya soalan di sini..."
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none text-slate-200 placeholder-slate-500 max-h-40"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || (!text.trim() && !pendingImageUrl)}
            className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center transition-opacity disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-500"
          >
            <SendIcon className="h-5 w-5" />
          </button>
        </div>
    </div>
  );
};

export default ChatInput;