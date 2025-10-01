import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import ChatInterface from './components/ChatInterface';
import ImageGeneration from './components/ImageGeneration';
import ImageEditing from './components/ImageEditing';
import ModeSwitcher from './components/ModeSwitcher';
import ChatHistoryModal from './components/ChatHistoryModal';
import { CrescentMoonIcon, HistoryIcon } from './components/icons';
import { Conversation, Message, Sender } from './types';
import { saveConversations, loadConversations } from './utils/localStorage';
import ModelSelector from './components/ModelSelector';
import { CHAT_MODELS, IMAGE_GENERATION_MODELS, IMAGE_EDITING_MODELS } from './constants';

export type AppMode = 'chat' | 'generate' | 'edit';

const DEFAULT_FIRST_MESSAGE: Message = {
    id: 'init',
    text: 'Assalamualaikum. Saya Nur al-Hikmah, pembantu AI anda. Sila kemukakan sebarang persoalan, dan insya-Allah saya akan menjawabnya berlandaskan logik (mantik) dan prinsip-prinsip Islam.',
    sender: Sender.Model,
};

const createNewConversation = (): Conversation => ({
    id: Date.now().toString(),
    title: 'Sembang Baru',
    timestamp: Date.now(),
    messages: [DEFAULT_FIRST_MESSAGE],
});

// Custom hook for state persistence in localStorage
const usePersistentState = <T,>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
    const [state, setState] = useState<T>(() => {
        try {
            const storedValue = localStorage.getItem(key);
            return storedValue ? JSON.parse(storedValue) : defaultValue;
        } catch (error) {
            console.warn(`Error reading localStorage key “${key}”:`, error);
            return defaultValue;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(state));
        } catch (error) {
            console.error(`Error setting localStorage key “${key}”:`, error);
        }
    }, [key, state]);

    return [state, setState];
};


const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('chat');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Model Selection State with persistence
  const [chatModel, setChatModel] = usePersistentState<string>('nur-hikmah-chatModel', CHAT_MODELS[0].id);
  const [imageGenModel, setImageGenModel] = usePersistentState<string>('nur-hikmah-imageGenModel', IMAGE_GENERATION_MODELS[0].id);
  const [imageEditModel, setImageEditModel] = usePersistentState<string>('nur-hikmah-imageEditModel', IMAGE_EDITING_MODELS[0].id);

  useEffect(() => {
    const loadedConversations = loadConversations();
    if (loadedConversations.length > 0) {
        setConversations(loadedConversations);
        // Set the most recent conversation as active
        const sorted = [...loadedConversations].sort((a,b) => b.timestamp - a.timestamp);
        setActiveConversationId(sorted[0].id);
    } else {
        const newConvo = createNewConversation();
        setConversations([newConvo]);
        setActiveConversationId(newConvo.id);
    }
  }, []);

  useEffect(() => {
    if (conversations.length > 0) {
        saveConversations(conversations);
    }
  }, [conversations]);
  
  // When local model is selected, force mode to 'chat'
  useEffect(() => {
    if (chatModel === 'nur-cahaya-local' && mode !== 'chat') {
        setMode('chat');
    }
  }, [chatModel, mode]);

  const ai = useMemo(() => {
    try {
      return new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    } catch (error) {
      console.error("Failed to initialize GoogleGenAI:", error);
      return null;
    }
  }, []);

  const handleUpdateConversation = useCallback((updatedConvo: Conversation) => {
    setConversations(prev =>
      prev.map(c => {
        if (c.id !== updatedConvo.id) {
          return c;
        }
  
        // This robust logic prevents the title from being reverted by stale state from the child component.
        // It checks the *current* state's title (`c.title`) to decide if a new title should be generated.
        const isNewChat = c.title === 'Sembang Baru';
        const userMessages = updatedConvo.messages.filter(m => m.sender === Sender.User);
        let newTitle = c.title;
  
        if (isNewChat && userMessages.length > 0) {
          const firstUserMessage = userMessages[0].text;
          newTitle = firstUserMessage.split(' ').slice(0, 5).join(' ') + (firstUserMessage.split(' ').length > 5 ? '...' : '');
        }
  
        // The final conversation object is built using the incoming messages but with the correctly managed title.
        return { ...updatedConvo, title: newTitle, timestamp: Date.now() };
      })
    );
  }, []);

  const handleNewConversation = useCallback(() => {
    const newConvo = createNewConversation();
    setConversations(prev => [newConvo, ...prev]);
    setActiveConversationId(newConvo.id);
    setIsHistoryModalOpen(false);
  }, []);

  const handleSelectConversation = useCallback((id: string) => {
    setActiveConversationId(id);
    setIsHistoryModalOpen(false);
  }, []);

  const handleDeleteConversation = useCallback((id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id));
    // If the active conversation is deleted, select another one or create a new one
    if (activeConversationId === id) {
        const remainingConversations = conversations.filter(c => c.id !== id);
        if (remainingConversations.length > 0) {
            const sorted = [...remainingConversations].sort((a,b) => b.timestamp - a.timestamp);
            setActiveConversationId(sorted[0].id);
        } else {
            handleNewConversation();
        }
    }
  }, [activeConversationId, conversations, handleNewConversation]);

  const handleDeleteAllConversations = useCallback(() => {
    const newConvo = createNewConversation();
    setConversations([newConvo]);
    setActiveConversationId(newConvo.id);
    setIsHistoryModalOpen(false);
  }, []);

  const activeConversation = useMemo(
    () => conversations.find(c => c.id === activeConversationId),
    [conversations, activeConversationId]
  );
  
  const isLocalChatActive = chatModel === 'nur-cahaya-local';
  
  const renderActiveComponent = () => {
    if (!ai && !isLocalChatActive) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-red-400">Gagal memuatkan model AI. Sila pastikan API Key anda sah.</p>
            </div>
        );
    }
    switch (mode) {
      case 'generate':
        return <ImageGeneration ai={ai} generationModel={imageGenModel} isLoading={isLoading} setIsLoading={setIsLoading} />;
      case 'edit':
        return <ImageEditing ai={ai} model={imageEditModel} isLoading={isLoading} setIsLoading={setIsLoading} />;
      case 'chat':
      default:
        return activeConversation ? (
          <ChatInterface 
            key={activeConversation.id}
            ai={ai} 
            conversation={activeConversation} 
            onUpdateConversation={handleUpdateConversation}
            model={chatModel}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            isLocalMode={isLocalChatActive}
          />
        ) : (
            <div className="flex items-center justify-center h-full">
                <p className="text-slate-400">Sila pilih atau cipta perbualan baru.</p>
            </div>
        );
    }
  };

  const { models, selectedModel, onModelChange } = useMemo(() => {
    switch(mode) {
        case 'generate':
            return { models: IMAGE_GENERATION_MODELS, selectedModel: imageGenModel, onModelChange: setImageGenModel };
        case 'edit':
            return { models: IMAGE_EDITING_MODELS, selectedModel: imageEditModel, onModelChange: setImageEditModel };
        case 'chat':
        default:
            return { models: CHAT_MODELS, selectedModel: chatModel, onModelChange: setChatModel };
    }
  }, [mode, chatModel, imageGenModel, imageEditModel, setChatModel, setImageGenModel, setImageEditModel]);

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800">
      <header className="p-4 border-b border-slate-700 shadow-lg bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
                <CrescentMoonIcon className="h-8 w-8 text-amber-300" />
                <div>
                    <h1 className="text-xl font-bold text-slate-100">Nur al-Hikmah</h1>
                    <p className="text-xs text-slate-400">Cahaya Kebijaksanaan & Mantik</p>
                    <p className="text-[10px] text-slate-500 italic mt-1">By Sharifah Nazirah Al Qadri</p>
                </div>
            </div>
            {mode === 'chat' && (
                <button 
                    onClick={() => setIsHistoryModalOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-700/80 text-slate-200 rounded-md hover:bg-slate-700 transition-colors text-sm"
                    aria-label="Buka Sejarah Perbualan"
                >
                    <HistoryIcon className="h-4 w-4" />
                    Sejarah
                </button>
            )}
        </div>
      </header>
      <div className="max-w-4xl mx-auto w-full pt-4">
        <ModeSwitcher currentMode={mode} setMode={setMode} isLoading={isLoading} isLocalChatActive={isLocalChatActive} />
        <ModelSelector 
            models={models}
            selectedModel={selectedModel}
            onModelChange={onModelChange}
            isLoading={isLoading}
        />
      </div>
      <main className="flex-1 overflow-y-auto pt-2">
        {renderActiveComponent()}
      </main>
      <ChatHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        onDeleteAllConversations={handleDeleteAllConversations}
      />
    </div>
  );
};

export default App;