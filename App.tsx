import React, { useState } from 'react';
import { UploadStep } from './components/UploadStep';
import { VerifyStep } from './components/VerifyStep';
import { AssignStep } from './components/AssignStep';
import { ResultStep } from './components/ResultStep';
import { AppStep, ExtractedReceiptData, Person, Assignment } from './types';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>('upload');
  const [receiptData, setReceiptData] = useState<ExtractedReceiptData | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const handleDataExtracted = (data: ExtractedReceiptData) => {
    setReceiptData(data);
    setStep('verify');
  };

  const handleVerified = (data: ExtractedReceiptData) => {
    setReceiptData(data);
    setStep('assign');
  };

  const handleAssignmentFinished = (newAssignments: Assignment[], newPeople: Person[]) => {
    setAssignments(newAssignments);
    setPeople(newPeople);
    setStep('result');
  };

  const resetApp = () => {
    setReceiptData(null);
    setPeople([]);
    setAssignments([]);
    setStep('upload');
  };

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={resetApp}>
            <img 
              src="https://i.ibb.co.com/n8RmLmmM/LOGO.jpg" 
              alt="TWA BillSplitter Logo" 
              className="h-10 w-auto rounded-lg object-contain"
            />
            <h1 className="text-xl font-bold text-gray-800">TWA BillSplitter</h1>
          </div>
          <div className="flex gap-2 text-xs font-medium">
             <StepIndicator current={step} target="upload" label="1. Upload" />
             <StepIndicator current={step} target="verify" label="2. Cek" />
             <StepIndicator current={step} target="assign" label="3. Bagi" />
             <StepIndicator current={step} target="result" label="4. Hasil" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {step === 'upload' && <UploadStep onDataExtracted={handleDataExtracted} />}
        
        {step === 'verify' && receiptData && (
          <VerifyStep 
            initialData={receiptData} 
            onConfirm={handleVerified} 
            onBack={resetApp} 
          />
        )}

        {step === 'assign' && receiptData && (
          <AssignStep 
            data={receiptData} 
            onFinish={handleAssignmentFinished} 
            onBack={() => setStep('verify')} 
          />
        )}

        {step === 'result' && receiptData && (
          <ResultStep 
            data={receiptData} 
            people={people} 
            assignments={assignments} 
            onReset={resetApp} 
          />
        )}
      </main>
    </div>
  );
};

const StepIndicator: React.FC<{ current: AppStep; target: AppStep; label: string }> = ({ current, target, label }) => {
  const steps = ['upload', 'verify', 'assign', 'result'];
  const currentIndex = steps.indexOf(current);
  const targetIndex = steps.indexOf(target);
  
  const isActive = currentIndex === targetIndex;
  const isCompleted = currentIndex > targetIndex;

  return (
    <div className={`px-3 py-1 rounded-full ${
      isActive ? 'bg-emerald-100 text-emerald-700' : 
      isCompleted ? 'text-emerald-600' : 'text-gray-400'
    }`}>
      {label}
    </div>
  );
};

export default App;