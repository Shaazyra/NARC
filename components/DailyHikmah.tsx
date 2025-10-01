import React, { useState, useEffect, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import { HIKMAH_GENERATION_PROMPT, HIKMAH_RESPONSE_SCHEMA } from '../constants';
import { BookOpenIcon, RefreshCwIcon } from './icons';

interface DailyHikmahProps {
    ai: GoogleGenAI | null;
}

interface Hikmah {
    quote: string;
    source: string;
}

const DailyHikmah: React.FC<DailyHikmahProps> = ({ ai }) => {
    const [hikmah, setHikmah] = useState<Hikmah | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchHikmah = useCallback(async () => {
        if (!ai) {
            setError("Mod luar talian aktif.");
            setHikmah({
                quote: "Dan barangsiapa yang bertakwa kepada Allah, nescaya Dia akan mengadakan baginya jalan keluar.",
                source: "Surah At-Talaq: 2"
            });
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: HIKMAH_GENERATION_PROMPT,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: HIKMAH_RESPONSE_SCHEMA,
                },
            });
            
            let jsonStr = response.text.trim();

            // The model may wrap the JSON output in markdown code blocks.
            // This logic robustly removes them before parsing.
            if (jsonStr.startsWith('```json')) {
                jsonStr = jsonStr.substring(7, jsonStr.length - 3).trim();
            } else if (jsonStr.startsWith('```')) {
                jsonStr = jsonStr.substring(3, jsonStr.length - 3).trim();
            }

            const parsedHikmah = JSON.parse(jsonStr) as Hikmah;
            
            if (parsedHikmah.quote && parsedHikmah.source) {
                setHikmah(parsedHikmah);
            } else {
                throw new Error("Respons daripada AI tidak lengkap.");
            }

        } catch (err) {
            console.error("Failed to fetch hikmah:", err);
            setError("Gagal mendapatkan hikmah buat masa ini.");
            // Fallback content in case of error
            setHikmah({
                quote: "Dan barangsiapa yang bertakwa kepada Allah, nescaya Dia akan mengadakan baginya jalan keluar.",
                source: "Surah At-Talaq: 2"
            });
        } finally {
            setIsLoading(false);
        }
    }, [ai]);

    useEffect(() => {
        fetchHikmah();
    }, [fetchHikmah]);

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="animate-pulse">
                    <div className="h-4 bg-slate-600 rounded w-3/4 mb-2.5"></div>
                    <div className="h-3 bg-slate-700 rounded w-1/4"></div>
                </div>
            );
        }

        if (error && !hikmah) {
            return <p className="text-sm text-red-400">{error}</p>;
        }

        if (hikmah) {
            return (
                <div>
                    <blockquote className="text-slate-200 text-sm italic">"{hikmah.quote}"</blockquote>
                    <cite className="block text-right text-xs text-amber-300/80 mt-1.5 not-italic">- {hikmah.source}</cite>
                </div>
            );
        }

        return null;
    };


    return (
        <div className="p-4 mb-4 bg-slate-800/60 border border-slate-700 rounded-lg shadow-md relative">
            <div className="flex items-start gap-4">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center border border-slate-600">
                    <BookOpenIcon className="h-5 w-5 text-amber-300" />
                </div>
                <div className="flex-1 min-w-0">
                    {renderContent()}
                </div>
                <button
                    onClick={fetchHikmah}
                    disabled={isLoading || !ai}
                    className="flex-shrink-0 p-1.5 rounded-full text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors disabled:opacity-50 disabled:cursor-wait"
                    aria-label="Dapatkan Hikmah Baru"
                    title="Dapatkan Hikmah Baru"
                >
                    <RefreshCwIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>
            {error && hikmah && <p className="text-xs text-red-400/70 mt-2 text-center">{error}</p>}
        </div>
    );
};

export default DailyHikmah;