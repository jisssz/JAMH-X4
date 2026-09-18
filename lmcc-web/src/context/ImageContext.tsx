import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ImageContextType {
  capturedImage: Blob | File | null;
  imagePreviewUrl: string | null;
  imageMetadata: {
    name: string;
    size: number;
    type: string;
    width?: number;
    height?: number;
  } | null;
  setCapturedImage: (fileOrBlob: Blob | File | null, fileName?: string) => void;
  clearImage: () => void;
}

const ImageContext = createContext<ImageContextType | undefined>(undefined);

export const ImageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [capturedImage, setCapturedImageState] = useState<Blob | File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageMetadata, setImageMetadata] = useState<ImageContextType['imageMetadata']>(null);

  const setCapturedImage = (fileOrBlob: Blob | File | null, customName?: string) => {
    // Revoke previous URL to prevent memory leaks
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    if (!fileOrBlob) {
      setCapturedImageState(null);
      setImagePreviewUrl(null);
      setImageMetadata(null);
      return;
    }

    const objectUrl = URL.createObjectURL(fileOrBlob);
    const fileName =
      customName ||
      (fileOrBlob instanceof File ? fileOrBlob.name : `capture_${Date.now()}.jpg`);

    setCapturedImageState(fileOrBlob);
    setImagePreviewUrl(objectUrl);

    // Read image dimensions safely in background
    const img = new Image();
    img.onload = () => {
      setImageMetadata({
        name: fileName,
        size: fileOrBlob.size,
        type: fileOrBlob.type || 'image/jpeg',
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.onerror = () => {
      setImageMetadata({
        name: fileName,
        size: fileOrBlob.size,
        type: fileOrBlob.type || 'image/jpeg',
      });
    };
    img.src = objectUrl;
  };

  const clearImage = () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setCapturedImageState(null);
    setImagePreviewUrl(null);
    setImageMetadata(null);
  };

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  return (
    <ImageContext.Provider
      value={{
        capturedImage,
        imagePreviewUrl,
        imageMetadata,
        setCapturedImage,
        clearImage,
      }}
    >
      {children}
    </ImageContext.Provider>
  );
};

export const useImage = (): ImageContextType => {
  const context = useContext(ImageContext);
  if (!context) {
    throw new Error('useImage must be used within an ImageProvider');
  }
  return context;
};
