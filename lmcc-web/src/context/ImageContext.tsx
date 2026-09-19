import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type PanelType = 'front' | 'back' | 'crimp' | 'other';

export interface ScanPanel {
  id: string;
  type: PanelType;
  label: string;
  blob: Blob | File;
  previewUrl: string;
}

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
  panels: ScanPanel[];
  currentPanelType: PanelType;
  setCurrentPanelType: (type: PanelType) => void;
  addPanel: (fileOrBlob: Blob | File, type?: PanelType, customLabel?: string) => boolean;
  addPanels: (filesOrBlobs: (Blob | File)[]) => number;
  updatePanelType: (id: string, type: PanelType, customLabel?: string) => void;
  removePanel: (id: string) => void;
  clearPanels: () => void;
  setCapturedImage: (fileOrBlob: Blob | File | null, fileName?: string) => void;
  clearImage: () => void;
}

const MAX_PANELS = 5;

const labelMap: Record<PanelType, string> = {
  front: 'Front / Main Label',
  back: 'Back Declaration Panel',
  crimp: 'Crimp / Seal / Base',
  other: 'Side / Additional Panel',
};

const ImageContext = createContext<ImageContextType | undefined>(undefined);

export const ImageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [capturedImage, setCapturedImageState] = useState<Blob | File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageMetadata, setImageMetadata] = useState<ImageContextType['imageMetadata']>(null);
  const [panels, setPanels] = useState<ScanPanel[]>([]);
  const [currentPanelType, setCurrentPanelType] = useState<PanelType>('front');

  /**
   * BUGFIX: addPanel creates a fresh ObjectURL per panel and does NOT revoke
   * it immediately. The primary capturedImage/preview anchor is set only for
   * the very first panel — subsequent panels must NOT overwrite it.
   */
  const addPanel = (fileOrBlob: Blob | File, type: PanelType = 'front', customLabel?: string): boolean => {
    if (panels.length >= MAX_PANELS) {
      return false;
    }

    const objectUrl = URL.createObjectURL(fileOrBlob);
    const id = `panel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const label = customLabel || labelMap[type] || 'Package Panel';

    const newPanel: ScanPanel = {
      id,
      type,
      label,
      blob: fileOrBlob,
      previewUrl: objectUrl,
    };

    setPanels((prev) => [...prev, newPanel]);

    // Only anchor primary image/preview if this is the first panel in the session
    setCapturedImageState((prev) => prev ?? fileOrBlob);
    setImagePreviewUrl((prev) => prev ?? objectUrl);

    return true;
  };

  /**
   * Add multiple panels at once. Uses functional state update (prev) to read
   * the real current length — avoids stale closure issues when panels state
   * hasn't propagated yet.
   */
  const addPanels = (filesOrBlobs: (Blob | File)[]): number => {
    const defaultSequence: PanelType[] = ['front', 'back', 'crimp', 'other', 'other'];
    let createdPanels: ScanPanel[] = [];

    setPanels((prev) => {
      const remainingSlots = MAX_PANELS - prev.length;
      if (remainingSlots <= 0) return prev;

      const toAdd = filesOrBlobs.slice(0, remainingSlots);
      const newPanels: ScanPanel[] = toAdd.map((fileOrBlob, idx) => {
        const slotIdx = prev.length + idx;  // uses ACTUAL current length from prev
        const type = defaultSequence[slotIdx] || 'other';
        const objectUrl = URL.createObjectURL(fileOrBlob);
        const id = `panel_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`;
        return {
          id,
          type,
          label: labelMap[type] || 'Package Panel',
          blob: fileOrBlob,
          previewUrl: objectUrl,
        };
      });

      createdPanels = newPanels;
      return [...prev, ...newPanels];
    });

    // Anchor primary preview only if this is the first batch
    // (createdPanels populated synchronously inside setState callback)
    if (createdPanels.length > 0) {
      const firstNew = createdPanels[0];
      setCapturedImageState((prev) => prev ?? firstNew.blob);
      setImagePreviewUrl((prev) => prev ?? firstNew.previewUrl);
    }

    return createdPanels.length;
  };

  const updatePanelType = (id: string, type: PanelType, customLabel?: string) => {
    setPanels((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              type,
              label: customLabel || labelMap[type] || p.label,
            }
          : p
      )
    );
  };

  /**
   * Remove a single panel and immediately revoke ONLY its own ObjectURL.
   * Other panels are NOT affected.
   */
  const removePanel = (id: string) => {
    setPanels((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      const remaining = prev.filter((p) => p.id !== id);
      if (remaining.length > 0) {
        const last = remaining[remaining.length - 1];
        setCapturedImageState(last.blob);
        setImagePreviewUrl(last.previewUrl);
      } else {
        setCapturedImageState(null);
        setImagePreviewUrl(null);
      }
      return remaining;
    });
  };

  /**
   * Clear all panels and revoke all their ObjectURLs at once.
   */
  const clearPanels = () => {
    setPanels((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      return [];
    });
    setCapturedImageState(null);
    setImagePreviewUrl(null);
  };

  const setCapturedImage = (fileOrBlob: Blob | File | null, customName?: string) => {
    if (!fileOrBlob) {
      setCapturedImageState(null);
      setImagePreviewUrl(null);
      setImageMetadata(null);
      clearPanels();
      return;
    }

    const objectUrl = URL.createObjectURL(fileOrBlob);
    const fileName =
      customName ||
      (fileOrBlob instanceof File ? fileOrBlob.name : `capture_${Date.now()}.jpg`);

    setCapturedImageState(fileOrBlob);
    setImagePreviewUrl(objectUrl);

    // Initialize panels session — revoke old panel URLs before replacing
    setPanels((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      return [
        {
          id: `panel_primary_${Date.now()}`,
          type: currentPanelType,
          label:
            currentPanelType === 'crimp'
              ? 'Crimp / Seal / Base'
              : currentPanelType === 'back'
              ? 'Back Declaration Panel'
              : 'Front / Main Label',
          blob: fileOrBlob,
          previewUrl: objectUrl,
        },
      ];
    });

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
    setCapturedImageState(null);
    setImagePreviewUrl(null);
    setImageMetadata(null);
    clearPanels();
  };

  /**
   * BUGFIX: Cleanup runs ONLY on context unmount (empty deps array), NOT on
   * every state change. The old implementation revoked URLs every time the
   * panels array reference changed, which killed ObjectURLs while they were
   * still needed by Processing.tsx and Results.tsx.
   */
  useEffect(() => {
    return () => {
      const urlsToRevoke = new Set<string>();
      panels.forEach((p) => urlsToRevoke.add(p.previewUrl));
      if (imagePreviewUrl) urlsToRevoke.add(imagePreviewUrl);
      urlsToRevoke.forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — run only on unmount

  return (
    <ImageContext.Provider
      value={{
        capturedImage,
        imagePreviewUrl,
        imageMetadata,
        panels,
        currentPanelType,
        setCurrentPanelType,
        addPanel,
        addPanels,
        updatePanelType,
        removePanel,
        clearPanels,
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
