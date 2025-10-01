import React, { useState, useCallback, useEffect } from 'react';
import { GoogleGenAI, Modality, Part } from '@google/genai';
import { IMAGE_GENERATION_PROMPT_PREFIX, LEONARDO_API_URL, FREEPIK_API_URL } from '../constants';
import { SparklesIcon, DownloadIcon, UploadIcon, CloseIcon, CameraIcon } from './icons';
import { fileToBase64 } from '../utils/image';
import CameraModal from './CameraModal';

interface ImageGenerationProps {
    ai: GoogleGenAI | null;
    generationModel: string;
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
}

interface GeneratedImage {
    id: string;
    url: string;
    prompt: string;
    isFallback?: boolean;
    fallbackSource?: string;
}

// Helper for polling
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));


const ImageGeneration: React.FC<ImageGenerationProps> = ({ ai, generationModel, isLoading, setIsLoading }) => {
    const [prompt, setPrompt] = useState('');
    const [outputImage, setOutputImage] = useState<GeneratedImage | null>(null);
    const [referenceImages, setReferenceImages] = useState<{b64: string, mime: string, url: string}[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);

    const isExternalModel = generationModel === 'leonardo-ai' || generationModel === 'freepik-ai';

    useEffect(() => {
        // Cleanup blob URLs on component unmount
        return () => {
            if (outputImage && outputImage.url.startsWith('blob:')) {
                URL.revokeObjectURL(outputImage.url);
            }
            referenceImages.forEach(img => URL.revokeObjectURL(img.url));
        };
    }, [outputImage, referenceImages]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (referenceImages.length >= 3) {
                setError("Anda hanya boleh memuat naik sehingga 3 imej rujukan.");
                return;
            }
            if (file.size > 4 * 1024 * 1024) { // 4MB limit
                setError("Saiz fail rujukan tidak boleh melebihi 4MB.");
                return;
            }
            setError(null);
            const b64 = await fileToBase64(file);
            const url = URL.createObjectURL(file);
            setReferenceImages(prev => [...prev, { b64, mime: file.type, url }]);
        }
        e.target.value = ''; // Allow re-uploading the same file
    };
    
    const handleImageCapture = useCallback((imageData: { b64: string; mime: string; url: string }) => {
        if (referenceImages.length < 3) {
            setReferenceImages(prev => [...prev, imageData]);
        } else {
            setError("Anda hanya boleh memuat naik sehingga 3 imej rujukan.");
        }
        setIsCameraOpen(false);
    }, [referenceImages]);

    const handleRemoveReferenceImage = (urlToRemove: string) => {
        setReferenceImages(prev => {
            const imageToRemove = prev.find(img => img.url === urlToRemove);
            if (imageToRemove) {
                URL.revokeObjectURL(imageToRemove.url);
            }
            return prev.filter(img => img.url !== urlToRemove);
        });
    };
    
    // External API Handlers
    const handleLeonardoGeneration = useCallback(async () => {
        if (!process.env.LEONARDO_API_KEY) {
            throw new Error("Leonardo AI API Key tidak ditetapkan.");
        }
        if (referenceImages.length > 0) {
            setError("Leonardo AI tidak menyokong imej rujukan dalam mod ini.");
            return;
        }

        const headers = {
            'accept': 'application/json',
            'content-type': 'application/json',
            'authorization': `Bearer ${process.env.LEONARDO_API_KEY}`
        };

        const startResponse = await fetch(`${LEONARDO_API_URL}/generations`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                prompt: prompt,
                modelId: "b7aa9932-a52c-4a74-b811-5eccc5a4ade8", // Leonardo Diffusion XL
                width: 1024,
                height: 1024,
                num_images: 1,
            })
        });

        if (!startResponse.ok) {
            const errorText = await startResponse.text();
            throw new Error(`Leonardo API (start) failed: ${startResponse.status} ${errorText}`);
        }

        const { sdGenerationJob } = await startResponse.json();
        const generationId = sdGenerationJob?.generationId;

        if (!generationId) throw new Error("Gagal mendapatkan ID generasi daripada Leonardo AI.");

        let attempts = 0;
        while (attempts < 30) { // Poll for ~3 minutes max
            await sleep(6000);
            const getResponse = await fetch(`${LEONARDO_API_URL}/generations/${generationId}`, { headers });
            
            if (!getResponse.ok) {
                console.warn(`Polling Leonardo API failed with status: ${getResponse.status}`);
                attempts++;
                continue;
            }

            const data = await getResponse.json();
            const generations_by_pk = data?.generations_by_pk;
            
            if (generations_by_pk) {
                if (generations_by_pk.status === 'COMPLETE') {
                    const imageUrl = generations_by_pk.generated_images?.[0]?.url;
                    if (imageUrl) {
                        setOutputImage({
                            id: generationId,
                            url: imageUrl,
                            prompt: prompt,
                            isFallback: true,
                            fallbackSource: 'Leonardo AI'
                        });
                        setPrompt('');
                        return; // Success!
                    } else {
                        throw new Error("Penjanaan Leonardo AI selesai tetapi tiada imej dikembalikan.");
                    }
                } else if (generations_by_pk.status === 'FAILED') {
                    throw new Error("Penjanaan Leonardo AI gagal. Sila semak prom anda atau cuba lagi nanti.");
                }
            }
            attempts++;
        }
        throw new Error("Penjanaan Leonardo AI mengambil masa terlalu lama (tamat masa). Sila cuba lagi.");
    }, [prompt, referenceImages]);

    const handleFreepikGeneration = useCallback(async () => {
        if (referenceImages.length > 0) {
            setError("Freepik AI tidak menyokong imej rujukan dalam mod ini.");
            return;
        }
        // This is a fictional API call.
        // To simulate, we will throw an error to inform the user.
        throw new Error("API Freepik tidak wujud. Ini hanyalah simulasi untuk tujuan paparan.");
        
    }, [prompt, referenceImages]);

    const handleGeminiGeneration = useCallback(async () => {
        if (!ai) {
            throw new Error("Klien AI tidak dimulakan. Sila pastikan API Key anda sah.");
        }

        const fullPrompt = IMAGE_GENERATION_PROMPT_PREFIX + prompt;
        const parts: Part[] = referenceImages.map(img => ({
            inlineData: { data: img.b64, mimeType: img.mime }
        }));
        parts.push({ text: fullPrompt });
        
        const response = await ai.models.generateContent({
            model: generationModel,
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

        if (imagePart?.inlineData) {
            setOutputImage({
                id: Date.now().toString(),
                url: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
                prompt: prompt,
            });
            setPrompt('');
        } else {
            const textPart = response.candidates?.[0]?.content?.parts?.find(p => p.text);
            const reason = textPart?.text ? ` Sebab: "${textPart.text}"` : " Ini mungkin kerana permintaan melanggar polisi keselamatan.";
            throw new Error(`Model tidak menghasilkan imej.${reason}`);
        }
    }, [ai, generationModel, prompt, referenceImages]);


    const handleGenerate = useCallback(async () => {
        if (!prompt.trim() || isLoading) return;

        setIsLoading(true);
        setError(null);
        if (outputImage) {
            // Revoke blob URL only, Leonardo URLs are external
            if (outputImage.url.startsWith('blob:')) URL.revokeObjectURL(outputImage.url);
            setOutputImage(null);
        }

        try {
            switch(generationModel) {
                case 'leonardo-ai':
                    await handleLeonardoGeneration();
                    break;
                case 'freepik-ai':
                    await handleFreepikGeneration();
                    break;
                default: // Gemini models
                    await handleGeminiGeneration();
                    break;
            }
        } catch (err) {
            console.error("Image generation failed:", err);
            const errorMessage = err instanceof Error ? err.message : "Sesuatu yang tidak dijangka telah berlaku.";
            setError(`Maaf, gagal mencipta imej. ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    }, [prompt, isLoading, outputImage, generationModel, setIsLoading, handleLeonardoGeneration, handleFreepikGeneration, handleGeminiGeneration]);

    const loadingMessage = useCallback(() => {
        if (generationModel === 'leonardo-ai') {
            return 'Menjana imej dengan Leonardo AI... Ini mungkin mengambil masa seminit.';
        }
        return 'AI sedang melukis visi anda...';
    }, [generationModel]);

    return (
        <>
            <div className="max-w-4xl mx-auto p-4">
                <div className="flex flex-col space-y-4">
                    {/* Output Section */}
                    <div className="w-full aspect-square bg-slate-800/50 border-2 border-dashed border-slate-600 rounded-lg flex items-center justify-center overflow-hidden relative">
                         {isLoading ? (
                            <div className="text-center text-slate-400 py-10 px-4">
                                <SparklesIcon className="h-12 w-12 mx-auto animate-pulse text-amber-300" />
                                <p className="mt-2">{loadingMessage()}</p>
                            </div>
                        ) : error ? (
                             <p className="p-4 text-center text-red-400">{error}</p>
                        ) : outputImage ? (
                           <div className="group relative w-full h-full">
                                <img src={outputImage.url} alt={outputImage.prompt} className="w-full h-full object-contain" />
                                {outputImage.isFallback && (
                                    <div className="absolute top-1.5 left-1.5 bg-amber-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-lg">
                                        {outputImage.fallbackSource}
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                                    <p className="text-xs text-slate-200 line-clamp-2">{outputImage.prompt}</p>
                                    <a
                                        href={outputImage.url}
                                        download={`nur-al-hikmah-${outputImage.id}.jpg`}
                                        className="self-end mt-1 p-1.5 bg-slate-900/70 text-white rounded-md hover:bg-slate-800"
                                        aria-label="Muat Turun Imej"
                                    >
                                        <DownloadIcon className="h-4 w-4" />
                                    </a>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center text-slate-500">
                                <SparklesIcon className="h-12 w-12 mx-auto" />
                                <p className="mt-2">Imej yang dicipta akan muncul di sini</p>
                            </div>
                        )}
                    </div>
                    
                    {/* Reference Image Section */}
                    <div>
                        <p className="text-sm text-slate-400 mb-2">Imej Rujukan (Pilihan, maksima 3)</p>
                        <div className="flex items-center gap-4 flex-wrap">
                            {referenceImages.map((image) => (
                                <div key={image.url} className="relative w-24 h-24 rounded-lg overflow-hidden group">
                                    <img src={image.url} alt="Reference" className="w-full h-full object-cover" />
                                    <button 
                                        onClick={() => handleRemoveReferenceImage(image.url)}
                                        className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                        aria-label="Remove reference image"
                                    >
                                        <CloseIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            {referenceImages.length < 3 && (
                                <div className="flex gap-2">
                                     <label 
                                        className={`w-24 h-24 bg-slate-800/50 border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center text-center text-slate-500 transition-colors ${isExternalModel ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-700/50 hover:border-slate-500'}`}
                                        title={isExternalModel ? "Imej rujukan tidak disokong untuk model ini" : "Muat Naik Fail"}
                                    >
                                        <UploadIcon className="h-6 w-6" />
                                        <p className="mt-1 text-xs">Muat Naik</p>
                                        <input type="file" accept="image/png, image/jpeg, image/webp" className="hidden" onChange={handleFileChange} disabled={isLoading || isExternalModel} />
                                    </label>
                                     <button 
                                        onClick={() => setIsCameraOpen(true)} 
                                        className={`w-24 h-24 bg-slate-800/50 border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center text-center text-slate-500 transition-colors ${isExternalModel ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-700/50 hover:border-slate-500'}`}
                                        disabled={isLoading || isExternalModel}
                                        title={isExternalModel ? "Imej rujukan tidak disokong untuk model ini" : "Guna Kamera"}
                                    >
                                         <CameraIcon className="h-6 w-6" />
                                         <p className="mt-1 text-xs">Kamera</p>
                                     </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="py-4">
                    <div className="flex items-end gap-3 bg-slate-800 border border-slate-600 rounded-xl p-2">
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Cth: Seorang angkasawan Muslim sedang solat di bulan..."
                            rows={2}
                            className="flex-1 bg-transparent resize-none outline-none text-slate-200 placeholder-slate-500 max-h-40"
                            disabled={isLoading}
                        />
                        <button
                            onClick={handleGenerate}
                            disabled={isLoading || !prompt.trim()}
                            className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center transition-opacity disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-500"
                            aria-label="Cipta Imej"
                        >
                            <SparklesIcon className="h-5 w-5" />
                        </button>
                    </div>
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

export default ImageGeneration;