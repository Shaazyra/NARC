export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // Result is "data:image/jpeg;base64,LzlqLzRBQ...". We only want the part after the comma.
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const dataUrlToBlob = async (dataUrl: string): Promise<{ blob: Blob, mime: string, b64: string }> => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const mime = blob.type;
    const b64 = dataUrl.split(',')[1];
    return { blob, mime, b64 };
};