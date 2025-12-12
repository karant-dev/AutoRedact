import { useState, useRef, useEffect } from 'react';
import { useOCR } from './hooks/useOCR';
import { useBatch } from './hooks/useBatch';
import { useDetectionSettings } from './hooks/useDetectionSettings';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Hero } from './components/Hero';
import { DropZone } from './components/DropZone';
import { FeaturesGrid } from './components/FeaturesGrid';
import { ResultsView } from './components/results/ResultsView';
import { BatchView } from './components/batch';
import { ImagePreviewModal } from './components/ImagePreviewModal';

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================
function App() {
  // Detection Settings (persisted to localStorage)
  const { settings, updateSetting } = useDetectionSettings();

  // Hooks
  const {
    imageFile,
    detectedItems,
    processingState,
    detectionStats,
    loadedImage,
    processImage,
    reset: resetOCR,
  } = useOCR(settings);

  const {
    batchMode,
    batchItems,
    batchProgress,
    handleBatchFiles,
    processBatchImages,
    resetBatch,
    handleDownloadZip,
    handleDownloadPdf,
  } = useBatch(settings);

  // Local State
  const [isDragging, setIsDragging] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Set document title
  useEffect(() => {
    document.title = 'AutoRedact';
  }, []);

  // ============================================================================
  // HANDLERS
  // ============================================================================
  const handleReset = () => {
    resetOCR();
    resetBatch();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }
    resetBatch();
    processImage(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    // Check for PDFs - always use batch mode for PDFs
    const hasPdf = Array.from(files).some(f => f.type === 'application/pdf');

    // Single image file - use original canvas UI
    if (files.length === 1 && !hasPdf && files[0].type.startsWith('image/')) {
      handleFile(files[0]);
      return;
    }

    // Multiple files or PDF - use batch mode
    resetOCR();
    handleBatchFiles(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check for PDFs - always use batch mode for PDFs
    const hasPdf = Array.from(files).some(f => f.type === 'application/pdf');

    // Single image file - use original canvas UI
    if (files.length === 1 && !hasPdf && files[0].type.startsWith('image/')) {
      handleFile(files[0]);
      return;
    }

    // Multiple files or PDF - use batch mode
    resetOCR();
    handleBatchFiles(files);
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Header settings={settings} onUpdateSetting={updateSetting} />

      <main className="max-w-6xl mx-auto px-6 py-12 flex-grow w-full">
        {/* Main Content */}
        {processingState.status === 'idle' && !batchMode ? (
          <>
            <Hero />
            <DropZone
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              isDragging={isDragging}
              fileInputRef={fileInputRef}
              onFileInputChange={handleFileInput}
            />
            <FeaturesGrid />
          </>
        ) : batchMode ? (
          <BatchView
            items={batchItems}
            progress={batchProgress}
            onProcess={processBatchImages}
            onDownloadZip={handleDownloadZip}
            onDownloadPdf={handleDownloadPdf}
            onReset={handleReset}
            onPreview={setPreviewImage}
          />
        ) : (
          <ResultsView
            processingState={processingState}
            stats={detectionStats}
            image={loadedImage}
            items={detectedItems}
            originalFileName={imageFile?.name}
            onReset={handleReset}
          />
        )}
      </main>

      <Footer />

      <ImagePreviewModal
        image={previewImage}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  );
}

export default App;
