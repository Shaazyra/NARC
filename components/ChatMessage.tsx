import React, { useState, useMemo } from 'react';
import { Message, Sender } from '../types';
import { UserIcon, CrescentMoonIcon, ClipboardIcon, CheckIcon, LightbulbIcon, BrainCircuitIcon, BookOpenIcon } from './icons';

interface ChatMessageProps {
  message: Message;
}

const TypingIndicator: React.FC = () => (
    <div className="flex items-center space-x-1">
        <div className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="h-2 w-2 bg-slate-400 rounded-full animate-bounce"></div>
    </div>
);

interface StructuredContent {
    intro: string;
    directAnswer: string;
    logicalAnalysis: string;
    islamicConnection: string;
}

const parseAndStructureResponse = (text: string): StructuredContent => {
    const parts: StructuredContent = {
      intro: '',
      directAnswer: '',
      logicalAnalysis: '',
      islamicConnection: '',
    };
  
    const directRegex = /\*\*Jawapan Langsung:\*\*\s*([\s\S]*?)(?=\*\*Analisis Logik \(Mantik\):\*\*|\*\*Hubung Kait Islamik:\*\*|$)/;
    const logicRegex = /\*\*Analisis Logik \(Mantik\):\*\*\s*([\s\S]*?)(?=\*\*Hubung Kait Islamik:\*\*|$)/;
    const islamicRegex = /\*\*Hubung Kait Islamik:\*\*\s*([\s\S]*?)(?=$)/;
  
    const directMatch = text.match(directRegex);
    const logicMatch = text.match(logicRegex);
    const islamicMatch = text.match(islamicRegex);
  
    if (directMatch) parts.directAnswer = directMatch[1].trim();
    if (logicMatch) parts.logicalAnalysis = logicMatch[1].trim();
    if (islamicMatch) parts.islamicConnection = islamicMatch[1].trim();
  
    const firstHeaderMatch = text.match(/\*\*(Jawapan Langsung:|Analisis Logik \(Mantik\):|Hubung Kait Islamik:)\*\*/);
    if (firstHeaderMatch && firstHeaderMatch.index > 0) {
      parts.intro = text.substring(0, firstHeaderMatch.index).trim();
    } else if (!directMatch && !logicMatch && !islamicMatch) {
      parts.intro = text;
    }
    
    return parts;
};


const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const [isCopied, setIsCopied] = useState(false);
  const isUser = message.sender === Sender.User;

  const handleCopy = () => {
    if (!message.text || isCopied) return;
    navigator.clipboard.writeText(message.text).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }).catch(err => {
      console.error("Failed to copy text:", err);
    });
  };

  const content = useMemo(() => {
    if (isUser || !message.text) {
        return <p className="whitespace-pre-wrap break-words">{message.text}</p>;
    }

    const { intro, directAnswer, logicalAnalysis, islamicConnection } = parseAndStructureResponse(message.text);

    if (!directAnswer && !logicalAnalysis && !islamicConnection) {
        return <p className="whitespace-pre-wrap break-words">{intro || message.text}</p>;
    }

    return (
        <div className="space-y-3">
            {intro && <p className="whitespace-pre-wrap break-words pb-1 text-slate-200">{intro}</p>}
            
            {directAnswer && (
                <div className="border-t border-slate-600/70 pt-3">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-300 mb-1.5">
                        <LightbulbIcon className="h-4 w-4" />
                        Jawapan Langsung
                    </h3>
                    <p className="whitespace-pre-wrap break-words text-slate-300 text-sm">{directAnswer}</p>
                </div>
            )}

            {logicalAnalysis && (
                <div className="border-t border-slate-600/70 pt-3">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-sky-300 mb-1.5">
                        <BrainCircuitIcon className="h-4 w-4" />
                        Analisis Logik (Mantik)
                    </h3>
                    <p className="whitespace-pre-wrap break-words text-slate-300 text-sm">{logicalAnalysis}</p>
                </div>
            )}

            {islamicConnection && (
                <div className="border-t border-slate-600/70 pt-3">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-emerald-300 mb-1.5">
                        <BookOpenIcon className="h-4 w-4" />
                        Hubung Kait Islamik
                    </h3>
                    <p className="whitespace-pre-wrap break-words text-slate-300 text-sm">{islamicConnection}</p>
                </div>
            )}
        </div>
    );
  }, [message.text, isUser]);

  const containerClasses = `flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`;
  const bubbleClasses = `max-w-xl p-3 rounded-2xl ${
    isUser
      ? 'bg-blue-600 text-white rounded-br-none'
      : 'bg-slate-700 text-slate-200 rounded-bl-none'
  }`;

  return (
    <div className={containerClasses}>
      {!isUser && (
        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-600">
            <CrescentMoonIcon className="h-5 w-5 text-amber-300"/>
        </div>
      )}
      <div className="group flex items-end gap-2">
        <div className={bubbleClasses}>
            {message.text === '' && !isUser && !message.image ? (
                <TypingIndicator />
            ) : (
              <div className="flex flex-col gap-2">
                  {message.image && (
                      <img 
                          src={`data:${message.image.mime};base64,${message.image.b64}`} 
                          alt="User upload" 
                          className="rounded-lg max-w-xs max-h-64 object-contain"
                      />
                  )}
                  {message.text && content}
              </div>
            )}
        </div>
        {!isUser && message.text && (
            <button 
                onClick={handleCopy} 
                className="p-1.5 rounded-full bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-slate-200 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity disabled:cursor-not-allowed"
                aria-label="Copy message"
                title="Copy message"
                disabled={isCopied}
            >
                {isCopied ? (
                    <CheckIcon className="h-4 w-4 text-green-400" />
                ) : (
                    <ClipboardIcon className="h-4 w-4" />
                )}
            </button>
        )}
      </div>
      {isUser && (
        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-slate-600 flex items-center justify-center">
            <UserIcon className="h-5 w-5 text-slate-200" />
        </div>
      )}
    </div>
  );
};

export default ChatMessage;