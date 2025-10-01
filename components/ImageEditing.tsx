import React, { useState, useCallback, useRef } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { IMAGE_EDITING_PROMPT_PREFIX } from '../constants';
import { EditIcon, UploadIcon, DownloadIcon, CameraIcon } from './icons';
import { fileToBase64, dataUrlToBlob } from '../utils/image';
import CameraModal from './CameraModal';

interface ImageEditingProps {
    ai: GoogleGenAI | null;
    model: string;
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
}

const ImageEditing: React.FC<ImageEditingProps> = ({ ai, model, isLoading, setIsLoading }) => {
    const [prompt, setPrompt] = useState('');
    const [inputImage, setInputImage] = useState<{b64: string, mime: string, url: string} | null>(null);
    const [outputImageUrl, setOutputImageUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const promptTextareaRef = useRef<HTMLTextAreaElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 4 * 1024 * 1024) { // 4MB limit
                setError("Saiz fail tidak boleh melebihi 4MB.");
                return;
            }
            setError(null);
            setOutputImageUrl(null);
            const b64 = await fileToBase64(file);
            const url = URL.createObjectURL(file);
            if (inputImage) {
                URL.revokeObjectURL(inputImage.url);
            }
            setInputImage({ b64, mime: file.type, url });
            promptTextareaRef.current?.focus();
        }
    };
    
    const handleImageCapture = useCallback((imageData: { b64: string; mime: string; url: string }) => {
        if (inputImage) {
            URL.revokeObjectURL(inputImage.url);
        }
        setInputImage(imageData);
        setIsCameraOpen(false);
        setOutputImageUrl(null);
        setError(null);
        promptTextareaRef.current?.focus();
    }, [inputImage]);

    const handleEdit = useCallback(async () => {
        if (!prompt.trim() || !inputImage || isLoading) return;

        setIsLoading(true);
        setError(null);
        setOutputImageUrl(null);

        try {
            if (!ai) {
                throw new Error("Klien AI tidak dimulakan. Sila pastikan API Key anda sah.");
            }
            const fullPrompt = IMAGE_EDITING_PROMPT_PREFIX + prompt;
            const response = await ai.models.generateContent({
                model: model,
                contents: {
                    parts: [
                        { inlineData: { data: inputImage.b64, mimeType: inputImage.mime } },
                        { text: fullPrompt },
                    ],
                },
                config: {
                    responseModalities: [Modality.IMAGE, Modality.TEXT],
                },
            });
            
            const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            const textPart = response.candidates?.[0]?.content?.parts?.find(p => p.text);
            
            if (imagePart?.inlineData) {
                const base64Image = imagePart.inlineData.data;
                setOutputImageUrl(`data:${imagePart.inlineData.mimeType};base64,${base64Image}`);
            } else {
                 const reason = textPart?.text ? ` Sebab: "${textPart.text}"` : " Ini mungkin kerana permintaan melanggar polisi keselamatan.";
                 throw new Error(`Model tidak menghasilkan imej.${reason}`);
            }

        } catch (err) {
            console.error("Image editing failed:", err);
            const errorMessage = err instanceof Error ? err.message : "Sesuatu yang tidak dijangka telah berlaku.";
            setError(`Maaf, gagal menyunting imej. ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    }, [ai, prompt, inputImage, isLoading, model, setIsLoading]);

    return (
        <>
            <div className="max-w-4xl mx-auto p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    {/* Input Image */}
                    <div className="w-full aspect-square bg-slate-800/50 border-2 border-dashed border-slate-600 rounded-lg flex items-center justify-center overflow-hidden relative">
                        {!inputImage ? (
                            <div className="flex flex-col items-center justify-center text-center text-slate-500 p-4 w-full h-full">
                                <label className="cursor-pointer p-4 w-full h-full flex flex-col items-center justify-center hover:bg-slate-700/50 hover:border-slate-500 transition-colors rounded-md">
                                    <UploadIcon className="h-12 w-12 mx-auto" />
                                    <p className="mt-2">Klik untuk muat naik</p>
                                    <input type="file" accept="image/png, image/jpeg, image/webp" className="hidden" onChange={handleFileChange} disabled={isLoading} />
                                </label>
                                <div className="text-xs my-2">atau</div>
                                <button onClick={() => setIsCameraOpen(true)} className="p-4 w-full h-full flex flex-col items-center justify-center hover:bg-slate-700/50 hover:border-slate-500 transition-colors rounded-md" disabled={isLoading}>
                                    <CameraIcon className="h-12 w-12" />
                                    <p className="mt-2">Guna Kamera</p>
                                </button>
                            </div>
                        ) : (
                            <>
                                <img src={inputImage.url} alt="Input" className="object-contain h-full w-full" />
                                <label className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity cursor-pointer">
                                    <UploadIcon className="h-12 w-12" />
                                    <p>Tukar Imej</p>
                                    <input type="file" accept="image/png, image/jpeg, image/webp" className="hidden" onChange={handleFileChange} disabled={isLoading} />
                                </label>
                            </>
                        )}
                    </div>

                    {/* Output Image */}
                    <div className="w-full aspect-square bg-slate-800/50 border-2 border-dashed border-slate-600 rounded-lg flex items-center justify-center overflow-hidden relative">
                        {isLoading ? (
                            <div className="text-center text-slate-400">
                                <EditIcon className="h-12 w-12 mx-auto animate-pulse text-amber-300" />
                                <p className="mt-2">AI sedang menyunting imej...</p>
                            </div>
                        ) : error ? (
                            <p className="text-red-400 p-4 text-center">{error}</p>
                        ) : outputImageUrl ? (
                            <>
                                <img src={outputImageUrl} alt="Edited image" className="object-contain h-full w-full" />
                                <a
                                    href={outputImageUrl}
                                    download={`nur-al-falak-edit-${Date.now()}.png`}
                                    className="absolute bottom-2 right-2 inline-flex items-center gap-2 px-3 py-1.5 bg-slate-900/70 text-white rounded-md hover:bg-slate-800 transition-colors"
                                >
                                    <DownloadIcon className="h-4 w-4" />
                                    <span className="text-xs">Muat Turun</span>
                                </a>
                            </>
                        ) : (
                            <div className="text-center text-slate-500">
                                <EditIcon className="h-12 w-12 mx-auto" />
                                <p className="mt-2">Imej yang disunting akan muncul di sini</p>
                            </div>
                        )}
                    </div>
                </div>
                <div className="py-4">
                    <div className="flex items-end gap-3 bg-slate-800 border border-slate-600 rounded-xl p-2">
                        <textarea
                            ref={promptTextareaRef}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Cth: Tambahkan hijab pada wanita ini..."
                            rows={2}
                            className="flex-1 bg-transparent resize-none outline-none text-slate-200 placeholder-slate-500 max-h-40"
                            disabled={isLoading || !inputImage}
                        />
                        <button
                            onClick={handleEdit}
                            disabled={isLoading || !prompt.trim() || !inputImage}
                            className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center transition-opacity disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-500"
                            aria-label="Sunting Imej"
                        >
                            <EditIcon className="h-5 w-5" />
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

export default ImageEditing;