import React, { useState } from 'react';
import { FileText, Brain, BookOpen, Lightbulb } from 'lucide-react';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import ProcessingStatus from './components/ProcessingStatus';
import Summary from './components/Summary';
import Notes from './components/Notes';
import Flashcards from './components/Flashcards';
import ChatBot from './components/ChatBot';

export type ProcessingStep = 'idle' | 'uploading' | 'processing' | 'generating' | 'completed' | 'error';

export interface StudyMaterial {
  summary: string;
  notes: string[];
  flashcards: Array<{
    id: string;
    question: string;
    answer: string;
  }>;
}

function App() {
  const [currentStep, setCurrentStep] = useState<ProcessingStep>('idle');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [studyMaterial, setStudyMaterial] = useState<StudyMaterial | null>(null);
  const [error, setError] = useState<string>('');

  const handleFileUpload = async (file: File) => {
    setUploadedFile(file);
    setCurrentStep('uploading');
    setError('');

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('pdf', file);

      // Upload and process the PDF
      setCurrentStep('processing');
      
      const response = await fetch('/api/process-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errmsg = 'Failed to process PDF';
        if(response.status == 413){
          errmsg = 'File too large. Maximum allowed size is 4MB.';
        }
        throw new Error(errmsg);
      }
      setCurrentStep('generating');
      
      const result = await response.json();    
      setStudyMaterial(result);
      setCurrentStep('completed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setCurrentStep('error');
    }
  };

  const resetApp = () => {
    setCurrentStep('idle');
    setUploadedFile(null);
    setStudyMaterial(null);
    setError('');
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {currentStep === 'idle' && (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Study Notes Generator
              </h1>
              <p className="text-gray-400 text-lg">
                Upload your PDF and get AI-generated summaries, notes, and flashcards
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
                <FileText className="w-8 h-8 text-blue-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Upload PDF</h3>
                <p className="text-gray-400 text-sm">
                  Upload your study material in PDF format
                </p>
              </div>
              
              <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
                <Brain className="w-8 h-8 text-purple-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">AI Processing</h3>
                <p className="text-gray-400 text-sm">
                  Advanced AI analyzes and extracts key information
                </p>
              </div>
              
              <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
                <BookOpen className="w-8 h-8 text-green-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Study Materials</h3>
                <p className="text-gray-400 text-sm">
                  Get summaries, notes, and interactive flashcards
                </p>
              </div>
            </div>

            <FileUpload onFileUpload={handleFileUpload} />
          </div>
        )}

        {(currentStep !== 'idle' && currentStep !== 'completed') && (
          <ProcessingStatus 
            currentStep={currentStep} 
            fileName={uploadedFile?.name || ''} 
            error={error}
            onReset={resetApp}
          />
        )}

        {currentStep === 'completed' && studyMaterial && (
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Study Materials Generated</h2>
              <button
                onClick={resetApp}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Upload New PDF
              </button>
            </div>
            
            <div className="grid lg:grid-cols-1 gap-8">
              <div className="space-y-8">
                <Summary summary={studyMaterial.summary} />
                <Notes notes={studyMaterial.notes} />
              </div>
              <div>
                <Flashcards flashcards={studyMaterial.flashcards} />
              </div>
            </div>

            {(currentStep == 'completed') && <div> <ChatBot/> </div>}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;