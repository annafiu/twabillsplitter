import React, { useState } from 'react';
import { Upload, FileText, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { Button, Card, LoadingSpinner } from './UI';
import { analyzeReceipt } from '../services/geminiService';
import { ExtractedReceiptData } from '../types';

interface UploadStepProps {
  onDataExtracted: (data: ExtractedReceiptData) => void;
}

export const UploadStep: React.FC<UploadStepProps> = ({ onDataExtracted }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const data = await analyzeReceipt(file);
      onDataExtracted(data);
    } catch (err: any) {
      console.error(err);
      // Show the actual error message if available, otherwise generic
      const msg = err?.message || "Gagal menganalisa struk. Pastikan gambar jelas dan coba lagi.";
      setError(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-800">Upload Struk Makanan</h2>
        <p className="text-gray-500">Upload screenshot atau foto struk (GoFood, Grab, Shopee).</p>
      </div>

      <Card className={`border-2 border-dashed transition-colors cursor-pointer relative ${error ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-emerald-500'}`}>
        <input 
          type="file" 
          accept="image/*,application/pdf"
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isAnalyzing}
        />
        <div className="flex flex-col items-center justify-center py-12 space-y-4 text-gray-500">
          {isAnalyzing ? (
            <>
              <LoadingSpinner />
              <p>Sedang menganalisa pesanan...</p>
            </>
          ) : (
            <>
              <div className={`p-4 rounded-full ${error ? 'bg-red-100' : 'bg-emerald-50'}`}>
                {error ? <AlertCircle className="w-8 h-8 text-red-600" /> : <Upload className="w-8 h-8 text-emerald-600" />}
              </div>
              <div className="text-center">
                <p className={`font-medium ${error ? 'text-red-700' : 'text-gray-700'}`}>
                    {error ? "Klik untuk coba lagi" : "Klik untuk upload"}
                </p>
                <p className="text-sm">PNG, JPG, atau PDF</p>
              </div>
            </>
          )}
        </div>
      </Card>

      {error && (
        <div className="p-4 bg-red-100 border border-red-200 text-red-700 rounded-lg text-sm text-center">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 text-center text-xs text-gray-400">
        <div className="flex flex-col items-center gap-1">
          <ImageIcon className="w-4 h-4" />
          <span>Screenshots</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <FileText className="w-4 h-4" />
          <span>Struk Foto</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <FileText className="w-4 h-4" />
          <span>PDF Invoice</span>
        </div>
      </div>

      <div className="pt-8 flex flex-col items-center justify-center opacity-90">
         <p className="text-sm text-gray-400 mb-2 italic">Pov: Liat total tagihan...</p>
         <img 
            src="https://i.ibb.co.com/qMpmxMWq/Screenshot-2025-12-15-093652.jpg" 
            alt="Funny Reaction" 
            className="mix-blend-multiply max-w-[250px] w-full"
         />
      </div>
    </div>
  );
};