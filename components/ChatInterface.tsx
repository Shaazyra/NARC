import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Part } from '@google/genai';
import { Message, Sender, Conversation } from '../types';
import { SYSTEM_INSTRUCTION, HUGGINGFACE_INFERENCE_API_URL, HUGGINGFACE_CHAT_MODEL, SYSTEM_INSTRUCTION_SIMPLE } from '../constants';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import DailyHikmah from './DailyHikmah';
import CameraModal from './CameraModal';

interface ChatInterfaceProps {
    ai: GoogleGenAI | null;
    conversation: Conversation;
    onUpdateConversation: (conversation: Conversation) => void;
    model: string;
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
    isLocalMode: boolean;
}

const localHikmah = [
    { quote: "Permulaan ilmu adalah niat, kemudian mendengar, kemudian faham, kemudian hafal, kemudian beramal, dan akhirnya menyebarkan.", source: "Abdullah ibn Mubarak" },
    { quote: "Jangan mencintai orang yang tidak mencintai Allah. Jika mereka boleh meninggalkan Allah, mereka akan meninggalkanmu.", source: "Imam Syafi'i" },
    { quote: "Dunia ini ibarat bayangan. Kalau kau cuba menangkapnya, ia akan lari. Tapi kalau kau palingkan badanmu, ia tiada pilihan selain mengikutimu.", source: "Ibn Qayyim Al-Jauziyyah" },
    { quote: "Orang yang paling aku sukai adalah dia yang menunjukkan kesalahanku.", source: "Umar bin Khattab R.A." }
];

const getLocalResponse = (text: string): string => {
    const lowerCaseText = text.toLowerCase().trim();

    if (/(salam|assalamualaikum|hai|helo|hi)/.test(lowerCaseText)) {
        return "Waalaikumussalam. Saya Nur-Cahaya, model sandaran tempatan. Ada apa yang boleh saya bantu?";
    }
    if (/(siapa awak|siapa anda|apa awak ni|what are you)/.test(lowerCaseText)) {
        return "Saya Nur-Cahaya, sebuah model AI ringkas yang beroperasi secara tempatan di peranti anda. Saya di sini untuk membantu apabila sambungan ke model utama, Nur al-Hikmah, terganggu. Keupayaan saya terhad, tetapi saya akan cuba yang terbaik.";
    }
    if (/(terima kasih|thank you|tq)/.test(lowerCaseText)) {
        return "Sama-sama. Gembira dapat membantu.";
    }

    const randomHikmah = localHikmah[Math.floor(Math.random() * localHikmah.length)];
    return `Maaf, sebagai model sandaran, saya tidak dapat memproses permintaan yang kompleks. Sambungan kepada AI utama mungkin sedang terganggu. Walau bagaimanapun, izinkan saya berkongsi sedikit hikmah:\n\n*_"${randomHikmah.quote}"_*\n- ${randomHikmah.source}`;
};


const ChatInterface: React.FC<ChatInterfaceProps> = ({ ai, conversation, onUpdateConversation, model, isLoading, setIsLoading, isLocalMode }) => {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ b64: string; mime: string; url: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation.messages]);

    const callHuggingFaceApi = async (prompt: string): Promise<string> => {
        const response = await fetch(`${HUGGINGFACE_INFERENCE_API_URL}${HUGGINGFACE_CHAT_MODEL}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.HF_TOKEN}`
            },
            body: JSON.stringify({
                inputs: prompt,
                parameters: {
                    max_new_tokens: 512,
                    return_full_text: false,
                }
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Hugging Face API failed with status ${response.status}: ${errorBody}`);
        }

        const result = await response.json();
        return result[0]?.generated_text || "Maaf, sandaran dalam talian gagal memberikan jawapan.";
    };

  const handleSendMessage = useCallback(async (text: string) => {
    if ((!text.trim() && !pendingImage) || isLoading) return;

    setIsLoading(true);
    
    const userMessage: Message = { 
      id: Date.now().toString(), 
      text, 
      sender: Sender.User,
      ...(pendingImage && { image: { b64: pendingImage.b64, mime: pendingImage.mime }})
    };
    
    if (pendingImage) {
      URL.revokeObjectURL(pendingImage.url);
      setPendingImage(null);
    }
    
    const previousMessages = conversation.messages;
    const modelPlaceholder: Message = { id: (Date.now() + 1).toString(), text: '', sender: Sender.Model };
    
    onUpdateConversation({ 
        ...conversation, 
        messages: [...previousMessages, userMessage, modelPlaceholder] 
    });

    // Handle local mode directly
    if (isLocalMode) {
        setTimeout(() => {
            const responseText = getLocalResponse(text);
            onUpdateConversation({
                ...conversation,
                messages: [...previousMessages, userMessage, { ...modelPlaceholder, text: responseText }]
            });
            setIsLoading(false);
        }, 500); // Simulate thinking
        return;
    }

    const historyForPrompt = previousMessages
        .filter(msg => msg.id !== 'init' && (msg.text || msg.image))
        .map(msg => `${msg.sender}: ${msg.text}`)
        .join('\n');
    const fullPromptForHf = `${SYSTEM_INSTRUCTION_SIMPLE}\n\n${historyForPrompt}\nuser: ${text}\nmodel:`;
    
    // Tiered Fallback Logic
    try {
        // Tier 1: Try Gemini (or selected primary model)
        if (model.startsWith('gemini')) {
             if (!ai) throw new Error("Klien AI Gemini tidak dimulakan.");
            
            const history = previousMessages
                .filter(msg => msg.id !== 'init' && (msg.text || msg.image))
                .map(msg => ({
                    role: msg.sender,
                    parts: [
                        ...(msg.image ? [{ inlineData: { data: msg.image.b64, mimeType: msg.image.mime } }] : []),
                        ...(msg.text ? [{ text: msg.text }] : []),
                    ] as Part[],
                }));

            const userParts: Part[] = [];
            if (userMessage.image) {
                userParts.push({ inlineData: { data: userMessage.image.b64, mimeType: userMessage.image.mime } });
            }
            if (userMessage.text.trim()) {
                userParts.push({ text: userMessage.text });
            }
          
            const contents = [...history, { role: 'user', parts: userParts }];

            const stream = await ai.models.generateContentStream({
                model: model,
                contents,
                config: { systemInstruction: SYSTEM_INSTRUCTION }
            });
          
            let fullResponse = '';
            for await (const chunk of stream) {
                if (chunk.text) {
                    fullResponse += chunk.text;
                    onUpdateConversation({
                        ...conversation,
                        messages: [...previousMessages, userMessage, { ...modelPlaceholder, text: fullResponse }]
                    });
                }
            }
        } else if (model === 'mistral-7b-backup') {
            // If Mistral is selected directly, use it as Tier 1
            const responseText = await callHuggingFaceApi(fullPromptForHf);
            onUpdateConversation({
                ...conversation,
                messages: [...previousMessages, userMessage, { ...modelPlaceholder, text: `(Dari Sandaran Mistral) ${responseText}` }]
            });
        }
    } catch (primaryError) {
        console.error("Primary model failed:", primaryError);

        try {
            // Tier 2: Try Hugging Face as backup
            onUpdateConversation({
                ...conversation,
                messages: [...previousMessages, userMessage, { ...modelPlaceholder, text: "Model utama gagal. Mencuba sandaran dalam talian..." }]
            });
            
            const fallbackResponse = await callHuggingFaceApi(fullPromptForHf);
            onUpdateConversation({
                ...conversation,
                messages: [...previousMessages, userMessage, { ...modelPlaceholder, text: `(Dari Sandaran Mistral) ${fallbackResponse}` }]
            });
        } catch (secondaryError) {
            console.error("Secondary model (Hugging Face) also failed:", secondaryError);
            // Tier 3: Fallback to local response
            const errorText = "Maaf, sambungan kepada semua AI dalam talian gagal. Menggunakan model sandaran luar talian untuk membalas.";
            const localFallbackResponse = getLocalResponse(text);
            onUpdateConversation({
                ...conversation,
                messages: [...previousMessages, userMessage, { ...modelPlaceholder, text: `${errorText}\n\n${localFallbackResponse}` }]
            });
        }
    } finally {
      setIsLoading(false);
    }
  }, [ai, isLoading, conversation, onUpdateConversation, pendingImage, model, setIsLoading, isLocalMode]);
  
  const handleImageCapture = useCallback((imageData: { b64: string; mime: string; url: string }) => {
    if (pendingImage) {
      URL.revokeObjectURL(pendingImage.url);
    }
    setPendingImage(imageData);
    setIsCameraOpen(false);
  }, [pendingImage]);

  const handleRemovePendingImage = useCallback(() => {
    if (pendingImage) {
        URL.revokeObjectURL(pendingImage.url);
        setPendingImage(null);
    }
  }, [pendingImage]);

  return (
    <>
      <div className="flex flex-col h-full max-w-4xl mx-auto">
        <div className="px-4 pt-4">
          <DailyHikmah ai={ai} />
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {conversation.messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-4 border-t border-slate-700 bg-slate-900/50">
          <ChatInput 
            onSendMessage={handleSendMessage} 
            isLoading={isLoading} 
            onOpenCamera={() => setIsCameraOpen(true)}
            pendingImageUrl={pendingImage?.url}
            onRemovePendingImage={handleRemovePendingImage}
            isLocalMode={isLocalMode}
          />
        </div>
      </div>
      <CameraModal 
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleImageCapture}
      />
    </>
  );
};

export default ChatInterface;