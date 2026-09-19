import React, { useRef, useState, useEffect } from 'react';
import { UploadCloud, Image as ImageIcon, AlertCircle, Check, X, RefreshCw } from 'lucide-react';

interface ImageUploadProps {
  onImageSelected: (image: File) => void;
  onImagesSelected?: (images: File[]) => void;
  multiple?: boolean;
  className?: string;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageSelected,
  onImagesSelected,
  multiple = true,
  className = '',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  // Clean up object URL when component unmounts or preview changes
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const validateAndProcessFile = (file: File) => {
    setError(null);

    // Validate type
    const fileType = file.type.toLowerCase();
    const isExtensionValid = /\.(jpe?g|png|webp)$/i.test(file.name);
    if (!ALLOWED_TYPES.includes(fileType) && !isExtensionValid) {
      setError('Unsupported file type. Please select a JPG, JPEG, PNG, or WebP image.');
      return;
    }

    // Validate size
    if (file.size > MAX_SIZE_BYTES) {
      setError(`Image is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please choose an image under 15MB.`);
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const url = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(url);

    const img = new Image();
    img.onload = () => {
      setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = url;
  };

  const handleFiles = (fileList: FileList) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    if (files.length > 1 && onImagesSelected) {
      // Validate all files
      const validFiles: File[] = [];
      for (const file of files) {
        const fileType = file.type.toLowerCase();
        const isExtensionValid = /\.(jpe?g|png|webp)$/i.test(file.name);
        if ((ALLOWED_TYPES.includes(fileType) || isExtensionValid) && file.size <= MAX_SIZE_BYTES) {
          validFiles.push(file);
        }
      }
      if (validFiles.length > 0) {
        onImagesSelected(validFiles);
        return;
      }
    }

    validateAndProcessFile(files[0]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleClearSelection = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setDimensions(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirm = () => {
    if (selectedFile) {
      onImageSelected(selectedFile);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <input
        type="file"
        ref={fileInputRef}
        multiple={multiple}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* 1. Preview Mode after Selection */}
      {selectedFile && previewUrl ? (
        <div className="bg-[#080c16]/90 rounded-3xl p-5 border border-white/[0.08] flex flex-col items-center shadow-xl">
          <div className="relative w-full aspect-[4/3] max-h-80 rounded-2xl overflow-hidden bg-black flex items-center justify-center mb-4 border border-white/[0.06]">
            <img
              src={previewUrl}
              alt="Selected packaged commodity label"
              className="w-full h-full object-contain"
            />
            <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full text-[11px] text-white font-sans font-medium border border-white/10">
              {dimensions ? `${dimensions.width} × ${dimensions.height}px` : 'Loading...'}
            </div>
            {dimensions && (dimensions.width < 350 || dimensions.height < 350) && (
              <div className="absolute top-3 right-3 bg-amber-500/20 text-amber-300 border border-amber-500/40 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-mono font-medium flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-amber-400" />
                <span>Low Resolution</span>
              </div>
            )}
          </div>

          {dimensions && (dimensions.width < 350 || dimensions.height < 350) && (
            <div className="w-full mb-3 flex items-start gap-2 text-[11px] text-amber-300/90 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 font-sans">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
              <span>
                Low resolution detected ({dimensions.width}×{dimensions.height}px). Ensure fine print (MRP, date, weight) is sharp and readable.
              </span>
            </div>
          )}

          <div className="w-full flex items-center justify-between mb-5 px-1 text-xs text-slate-300 font-sans">
            <div className="truncate max-w-[200px]">
              <span className="font-medium block truncate text-slate-100">{selectedFile.name}</span>
              <span className="text-slate-400">{(selectedFile.size / 1024).toFixed(0)} KB</span>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-slate-300 hover:text-white font-medium flex items-center gap-1 cursor-pointer transition"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              <span>Change</span>
            </button>
          </div>

          <div className="flex gap-3 w-full font-sans">
            <button
              type="button"
              onClick={handleClearSelection}
              className="flex-1 py-3 px-4 bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 text-xs font-medium rounded-full border border-white/[0.08] transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5 text-slate-400 inline mr-1" />
              <span>Clear</span>
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 py-3 px-6 bg-white text-slate-950 hover:bg-slate-100 text-xs font-semibold rounded-full shadow-lg transition active:scale-95 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 inline mr-1" />
              <span>Use This Image</span>
            </button>
          </div>
        </div>
      ) : (
        /* 2. Upload Dropzone / Picker */
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 ${
            dragOver
              ? 'border-emerald-400 bg-emerald-500/[0.06] scale-[1.01]'
              : 'border-white/[0.12] hover:border-white/30 bg-[#080c16]/70 hover:bg-[#080c16]'
          }`}
        >
          <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-slate-300">
            {dragOver ? <UploadCloud className="w-6 h-6 text-emerald-400 animate-bounce" /> : <ImageIcon className="w-6 h-6" />}
          </div>
          <div>
            <p className="text-sm font-sans font-medium text-slate-200">
              Select or drop packaging photograph
            </p>
            <p className="text-xs font-sans text-slate-400 mt-1">
              Supports JPG, JPEG, PNG, WebP (up to 15MB)
            </p>
          </div>
          <button
            type="button"
            className="mt-2 px-5 py-2.5 bg-white text-slate-950 hover:bg-slate-100 text-xs font-sans font-semibold rounded-full transition shadow-md cursor-pointer"
          >
            Browse files
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-center gap-2 text-xs text-red-400 bg-red-950/40 p-3 rounded-xl border border-red-800/50">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
