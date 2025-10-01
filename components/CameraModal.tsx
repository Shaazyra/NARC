import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CloseIcon, CameraIcon, RefreshCwIcon } from './icons';
import { dataUrlToBlob } from '../utils/image';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageData: { b64: string; mime: string; url: string }) => void;
}

const CameraModal: React.FC<CameraModalProps> = ({ isOpen, onClose, onCapture }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = useCallback(async () => {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    setError(null);
    setCapturedImage(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Gagal mengakses kamera. Sila pastikan anda telah memberi kebenaran dalam tetapan pelayar anda.");
    }
  }, [stream]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
      }
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };
  
  const handleConfirm = async () => {
    if (capturedImage) {
        const { blob, mime, b64 } = await dataUrlToBlob(capturedImage);
        const url = URL.createObjectURL(blob);
        onCapture({ b64, mime, url });
        onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="w-full max-w-lg bg-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-4 flex justify-between items-center border-b border-slate-700">
          <h2 className="text-lg font-bold text-slate-100">Ambil Gambar</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-700" aria-label="Tutup">
            <CloseIcon className="w-5 h-5 text-slate-400" />
          </button>
        </header>
        
        <div className="flex-1 p-4 overflow-hidden flex items-center justify-center">
            <div className="w-full aspect-video bg-black rounded-lg overflow-hidden relative">
                {error ? (
                    <div className="text-red-400 text-center p-4 flex items-center justify-center h-full">{error}</div>
                ) : (
                    <>
                        <video ref={videoRef} autoPlay playsInline className={`w-full h-full object-cover ${capturedImage ? 'hidden' : 'block'}`} />
                        {capturedImage && (
                            <img src={capturedImage} alt="Captured preview" className="w-full h-full object-contain" />
                        )}
                    </>
                )}
            </div>
            <canvas ref={canvasRef} className="hidden" />
        </div>

        <footer className="p-4 border-t border-slate-700">
          {!capturedImage ? (
              <button
                onClick={handleCapture}
                disabled={!stream}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-lg font-bold rounded-md transition-colors text-white bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed"
              >
                  <CameraIcon className="h-6 w-6" />
                  Ambil Gambar
              </button>
          ) : (
            <div className="flex gap-4">
                <button
                    onClick={handleRetake}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors text-slate-200 bg-slate-600 hover:bg-slate-500"
                >
                    <RefreshCwIcon className="h-4 w-4" />
                    Ambil Semula
                </button>
                <button
                    onClick={handleConfirm}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors text-white bg-green-600 hover:bg-green-500"
                >
                    Guna Gambar Ini
                </button>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
};

export default CameraModal;
