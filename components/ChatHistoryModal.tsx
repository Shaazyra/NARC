import React from 'react';
import { Conversation } from '../types';
import { PlusIcon, MessageSquareIcon, TrashIcon, CloseIcon } from './icons';

interface ChatHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onDeleteAllConversations: () => void;
}

const ChatHistoryModal: React.FC<ChatHistoryModalProps> = ({
  isOpen,
  onClose,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onDeleteAllConversations,
}) => {
  if (!isOpen) return null;

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Anda pasti ingin memadamkan perbualan ini?')) {
      onDeleteConversation(id);
    }
  };

  const handleDeleteAll = () => {
    if (window.confirm('Anda pasti ingin memadamkan SEMUA sejarah perbualan? Tindakan ini tidak boleh diundur.')) {
        onDeleteAllConversations();
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="w-full max-w-lg bg-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-4 flex justify-between items-center border-b border-slate-700">
          <h2 className="text-lg font-bold text-slate-100">Sejarah Perbualan</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-700" aria-label="Tutup">
            <CloseIcon className="w-5 h-5 text-slate-400" />
          </button>
        </header>
        <div className="p-2 border-b border-slate-700">
          <button
            onClick={onNewConversation}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors text-slate-200 bg-slate-700 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4" />
            Mula Sembang Baru
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {conversations.length > 0 ? (
            <ul>
              {conversations
                .slice()
                .sort((a, b) => b.timestamp - a.timestamp)
                .map((convo) => (
                  <li key={convo.id}>
                    <button
                      onClick={() => onSelectConversation(convo.id)}
                      className={`group w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm ${
                        activeConversationId === convo.id
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <MessageSquareIcon className="h-4 w-4 flex-shrink-0" />
                      <div className="flex-1 truncate">
                        <p className="font-medium truncate">{convo.title}</p>
                        <p className={`text-xs truncate ${activeConversationId === convo.id ? 'text-blue-200' : 'text-slate-400'}`}>
                          {new Date(convo.timestamp).toLocaleString('ms-MY')}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDelete(e, convo.id)}
                        className="ml-auto flex-shrink-0 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-400 p-1 rounded-md transition-opacity"
                        aria-label="Padam perbualan"
                        title="Padam perbualan"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </button>
                  </li>
                ))}
            </ul>
          ) : (
            <div className="text-center py-10 text-slate-500">
                <p>Tiada sejarah perbualan.</p>
            </div>
          )}
        </div>
        {conversations.length > 0 && (
            <footer className="p-2 border-t border-slate-700">
                <button
                    onClick={handleDeleteAll}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors text-red-300 bg-red-900/40 hover:bg-red-900/70 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-red-500"
                >
                    <TrashIcon className="h-4 w-4" />
                    Padam Semua Sejarah
                </button>
            </footer>
        )}
      </div>
    </div>
  );
};

export default ChatHistoryModal;