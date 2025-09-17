import React, { useState, useCallback, useEffect } from 'react';
import { generateRotatedImage } from './services/geminiService';
import { GridCell } from './components/GridCell';
import { UploadIcon, DownloadIcon, ResetIcon, ObjectIcon, SpinnerIcon, CloseIcon, KeyIcon } from './components/Icons';

// This is required to use JSZip from CDN
declare const JSZip: any;

interface GeneratedImage {
  src: string;
  prompt: string;
}

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const [tempApiKey, setTempApiKey] = useState<string>('');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [originalImageMimeType, setOriginalImageMimeType] = useState<string>('');
  const [generatedImages, setGeneratedImages] = useState<(GeneratedImage | null)[]>(Array(4).fill(null));
  const [isObjectRotationOnly, setIsObjectRotationOnly] = useState<boolean>(false);
  const [loadingSlots, setLoadingSlots] = useState<boolean[]>([false, false, false, false]);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');
  
  useEffect(() => {
    const storedApiKey = localStorage.getItem('gemini-api-key');
    if (storedApiKey) {
      setApiKey(storedApiKey);
    } else {
      setIsApiKeyModalOpen(true);
    }
  }, []);

  const handleApiKeySave = () => {
    if (tempApiKey.trim()) {
      setApiKey(tempApiKey);
      localStorage.setItem('gemini-api-key', tempApiKey);
      setIsApiKeyModalOpen(false);
    }
  };

  const isLoading = loadingSlots.some(s => s);
  const isGenerationComplete = generatedImages.some(img => img !== null) && !isLoading;

  const resetState = useCallback(() => {
    setOriginalImage(null);
    setOriginalImageMimeType('');
    setGeneratedImages(Array(4).fill(null));
    setLoadingSlots([false, false, false, false]);
    setStatus('');
    setError('');
  }, []);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
        setError("Please upload a valid image file.");
        return;
    }
    
    if (!apiKey) {
      setError("API Key is not set. Please set it first.");
      setIsApiKeyModalOpen(true);
      return;
    }

    resetState();
    setStatus('Reading image...');
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const fullDataUrl = reader.result as string;
        const base64Image = fullDataUrl.split(',')[1];
        setOriginalImage(fullDataUrl);
        setOriginalImageMimeType(file.type);
        
        setStatus('Generating new perspectives...');
        setLoadingSlots([true, true, true, true]);

        const basePrompts = [
          "A medium shot of all the people in the image, maintaining the original camera perspective.",
          "An extreme close-up (macro shot) of the faces of everyone in the image, capturing fine details.",
          "Generate a completely new image from a different camera angle. The camera MUST be positioned on the left side of the subjects. Create a perfect left profile view where their faces are turned exactly 90 degrees to the right, showing only the left side of their faces. Their gaze should be directed towards the right edge of the frame.",
          "Generate a completely new image from a different camera angle. The camera MUST be positioned on the right side of the subjects. Create a perfect right profile view where their faces are turned exactly 90 degrees to the left, showing only the right side of their faces. Their gaze should be directed towards the left edge of the frame."
        ];
        
        const objectOnlySuffix = " Isolate the main subjects' faces and place them on a seamless, plain white background.";
        const finalPrompts = basePrompts.map(p => isObjectRotationOnly ? p + objectOnlySuffix : p);

        const generationPromises = finalPrompts.map(prompt => 
            generateRotatedImage(apiKey, base64Image, file.type, prompt, 0.4)
        );

        const results = await Promise.allSettled(generationPromises);

        const newImages = results.map((result, i) => {
            if (result.status === 'fulfilled') {
                return { src: result.value, prompt: finalPrompts[i] };
            } else {
                console.error(`Failed to generate image for slot ${i + 1}:`, result.reason);
                if (result.reason instanceof Error && result.reason.message.includes("API key not valid")) {
                  setError("Your API key is not valid. Please check it and try again.");
                  setIsApiKeyModalOpen(true);
                }
                return null;
            }
        });

        setGeneratedImages(newImages);
        
        const successfulGenerations = newImages.filter(img => img !== null).length;
        if (successfulGenerations < 4 && !error) {
            setError(`Successfully generated ${successfulGenerations} out of 4 images. Some views may have failed.`);
        }

      } catch (e: any) {
        setError(e.message || 'An unexpected error occurred.');
      } finally {
        setLoadingSlots([false, false, false, false]);
        setStatus('');
      }
    };
    reader.onerror = () => {
        setError('Failed to read the image file.');
        setStatus('');
    };
    reader.readAsDataURL(file);
  };
  
  const handleDownloadZip = async () => {
    if (!originalImage) return;
    setStatus("Preparing ZIP file...");
    try {
        const zip = new JSZip();
        zip.file("original_image.png", originalImage.split(',')[1], { base64: true });
        
        generatedImages.forEach((img, i) => {
            if (img) {
                zip.file(`generated_image_${i + 1}.png`, img.src.split(',')[1], { base64: true });
            }
        });
        
        const content = await zip.generateAsync({ type: "blob" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(content);
        link.download = "ai_generated_faces.zip";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (e) {
        setError("Failed to create ZIP file.");
        console.error(e);
    } finally {
        setStatus("");
    }
  };


  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans flex flex-col items-center p-4 sm:p-6 md:p-8 relative">
      {isApiKeyModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg shadow-2xl p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-3"><KeyIcon className="w-6 h-6 text-yellow-400"/> Enter your Gemini API Key</h2>
            <p className="text-gray-400 mb-6">To use this application, you need to provide your own Google AI Gemini API key. It will be stored securely in your browser's local storage.</p>
            <input 
              type="password"
              value={tempApiKey}
              onChange={(e) => setTempApiKey(e.target.value)}
              placeholder="Paste your API key here"
              className="w-full bg-gray-900 border border-gray-700 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
            />
            <button 
              onClick={handleApiKeySave}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 disabled:opacity-50"
              disabled={!tempApiKey.trim()}
            >
              Save and Continue
            </button>
          </div>
        </div>
      )}

      <div className={`w-full max-w-5xl transition-filter duration-300 ${!apiKey ? 'blur-sm pointer-events-none' : ''}`}>
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">AI Face Angle Generator</h1>
          <p className="text-lg text-gray-400 mt-2 max-w-2xl mx-auto">Upload a portrait to automatically generate four new close-up perspectives of the face.</p>
        </header>

        <main className="bg-gray-800/50 p-6 rounded-2xl shadow-2xl border border-gray-700/50">
          {!originalImage && (
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-600 rounded-xl text-center">
              <UploadIcon className="w-16 h-16 text-gray-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Upload Your Portrait</h2>
              <p className="text-gray-400 mb-6">Drag & drop or click to select a file.</p>
              <input
                id="file-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <label htmlFor="file-upload" className="cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300">
                Select Image
              </label>
            </div>
          )}

          {originalImage && (
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                 <div className="flex-grow min-w-0">
                    {isLoading && <p className="text-lg text-yellow-400 animate-pulse">{status}</p>}
                    {error && <p className="text-lg text-red-400">{error}</p>}
                 </div>
                 <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        onClick={handleDownloadZip}
                        disabled={!isGenerationComplete}
                        className="flex items-center gap-2 bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <DownloadIcon className="w-5 h-5" />
                        Download ZIP
                    </button>
                    <button
                        onClick={resetState}
                        disabled={isLoading}
                        className="flex items-center gap-2 bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-300 hover:bg-gray-600 disabled:opacity-50"
                    >
                        <ResetIcon className="w-5 h-5" />
                        Reset
                    </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  <div className="aspect-square bg-black rounded-lg overflow-hidden border border-gray-700/50 shadow-lg">
                      <img src={originalImage} alt="Original" className="w-full h-full object-contain" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      {loadingSlots.map((loading, index) => (
                        <GridCell key={index} prompt={generatedImages[index]?.prompt}>
                            {loading ? (
                                <div className="flex flex-col items-center justify-center gap-2 text-gray-400">
                                    <SpinnerIcon className="w-10 h-10 animate-spin"/>
                                    <span className="text-sm">Generating...</span>
                                </div>
                            ) : generatedImages[index] ? (
                                <img src={generatedImages[index]!.src} alt={`Generated view ${index + 1}`} className="w-full h-full object-cover" />
                            ) : (
                                <div className="flex flex-col items-center justify-center text-center text-gray-500">
                                  <CloseIcon className="w-10 h-10" />
                                  <span className="text-xs mt-1">Failed</span>
                                </div>
                            )}
                        </GridCell>
                      ))}
                  </div>
              </div>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-700/50 flex flex-col items-center gap-4">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div className={`relative w-12 h-6 rounded-full transition-colors ${isObjectRotationOnly ? 'bg-indigo-600' : 'bg-gray-600'}`}>
                <span className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform ${isObjectRotationOnly ? 'translate-x-6' : ''}`}></span>
              </div>
              <input
                type="checkbox"
                checked={isObjectRotationOnly}
                onChange={(e) => setIsObjectRotationOnly(e.target.checked)}
                className="hidden"
                disabled={isLoading || !!originalImage}
              />
              <span className="font-semibold text-lg flex items-center gap-2">
                <ObjectIcon className="w-6 h-6"/>
                Isolate Face Only
              </span>
            </label>
             <button onClick={() => setIsApiKeyModalOpen(true)} className="text-sm text-gray-400 hover:text-indigo-400 flex items-center gap-1">
                <KeyIcon className="w-4 h-4" /> Change API Key
            </button>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;