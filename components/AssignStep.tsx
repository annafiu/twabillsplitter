import React, { useState } from 'react';
import { ExtractedReceiptData, Person, Assignment } from '../types';
import { Button, Card, Input, formatRupiah } from './UI';
import { Plus, User, X } from 'lucide-react';

interface AssignStepProps {
  data: ExtractedReceiptData;
  onFinish: (assignments: Assignment[], people: Person[]) => void;
  onBack: () => void;
}

export const AssignStep: React.FC<AssignStepProps> = ({ data, onFinish, onBack }) => {
  const [people, setPeople] = useState<Person[]>([]);
  const [newPersonName, setNewPersonName] = useState('');
  // Map itemId -> personId
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  const addPerson = () => {
    if (!newPersonName.trim()) return;
    setPeople([...people, { id: `p-${Date.now()}`, name: newPersonName }]);
    setNewPersonName('');
  };

  const removePerson = (id: string) => {
    setPeople(people.filter(p => p.id !== id));
    // Remove assignments for this person
    const newAssignments = { ...assignments };
    Object.keys(newAssignments).forEach(key => {
      if (newAssignments[key] === id) delete newAssignments[key];
    });
    setAssignments(newAssignments);
  };

  const handleAssign = (itemId: string, personId: string) => {
    setAssignments(prev => ({
      ...prev,
      [itemId]: personId
    }));
  };

  const isComplete = data.items.every(item => assignments[item.id]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800">Siapa pesan apa?</h2>
        <p className="text-gray-500">Masukkan nama teman dan pilih menu mereka.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left Column: People Management */}
        <div className="md:col-span-1 space-y-4">
          <Card className="sticky top-4">
            <h3 className="font-semibold text-gray-700 mb-4">Daftar Orang</h3>
            <div className="flex gap-2 mb-4">
              <Input 
                placeholder="Nama (Misal: Budi)" 
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addPerson()}
              />
              <Button onClick={addPerson} className="px-3"><Plus size={20} /></Button>
            </div>
            
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {people.length === 0 && (
                <p className="text-sm text-gray-400 italic text-center py-8">
                  Belum ada nama. <br/> Tambahkan nama pemesan di atas.
                </p>
              )}
              {people.map(person => (
                <div key={person.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-emerald-50 transition-colors">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <User size={18} className="text-emerald-600 shrink-0" />
                    <span className="font-medium text-gray-700 truncate">{person.name}</span>
                  </div>
                  <button onClick={() => removePerson(person.id)} className="text-gray-400 hover:text-red-500 shrink-0 ml-2">
                    <X size={18} />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column: Item Assignment */}
        <div className="md:col-span-2 space-y-4">
          <Card>
            <h3 className="font-semibold text-gray-700 mb-4">Daftar Menu</h3>
            <div className="space-y-3">
              {data.items.map(item => (
                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg gap-3">
                  <div className="flex-grow">
                    <p className="font-medium text-gray-800">{item.name}</p>
                    <p className="text-sm text-gray-500">{formatRupiah(item.price)}</p>
                  </div>
                  <div className="w-full sm:w-48">
                    <select 
                      className={`w-full p-2 rounded border text-gray-900 ${assignments[item.id] ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-gray-300'}`}
                      value={assignments[item.id] || ''}
                      onChange={(e) => handleAssign(item.id, e.target.value)}
                    >
                      <option value="">-- Pilih Orang --</option>
                      {people.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t sticky bottom-0 bg-[#f3f4f6] pb-4 z-10">
        <Button variant="secondary" onClick={onBack} className="w-full">
          Kembali
        </Button>
        <Button 
          disabled={!isComplete} 
          onClick={() => {
            const finalAssignments = Object.entries(assignments).map(([itemId, personId]) => ({ itemId, personId }));
            onFinish(finalAssignments, people);
          }} 
          className="w-full"
        >
          Hitung Total
        </Button>
      </div>
    </div>
  );
};