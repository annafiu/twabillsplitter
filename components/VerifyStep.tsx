import React, { useState } from 'react';
import { ExtractedReceiptData, ReceiptItem } from '../types';
import { Button, Card, Input, formatRupiah } from './UI';
import { Plus, Trash2 } from 'lucide-react';

interface VerifyStepProps {
  initialData: ExtractedReceiptData;
  onConfirm: (data: ExtractedReceiptData) => void;
  onBack: () => void;
}

export const VerifyStep: React.FC<VerifyStepProps> = ({ initialData, onConfirm, onBack }) => {
  const [data, setData] = useState<ExtractedReceiptData>(initialData);

  // Helper to format number to "5.000,00" string for display
  const formatThousands = (val: number) => {
    if (val === undefined || val === null) return '';
    // Show decimals in input as well to be accurate
    return val.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  // Helper to parse "5.000,75" string to numeric value
  const parseThousands = (val: string) => {
    // Remove dots (thousands separators), replace comma with dot (decimal separator)
    const clean = val.replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.]/g, '');
    return parseFloat(clean) || 0;
  };

  React.useEffect(() => {
    const explodedItems: ReceiptItem[] = [];
    initialData.items.forEach(item => {
      if (item.quantity > 1) {
        const unitPrice = item.price / item.quantity;
        for (let i = 0; i < item.quantity; i++) {
          explodedItems.push({
            ...item,
            id: `${item.id}-${i}`,
            name: `${item.name} (${i + 1}/${item.quantity})`,
            price: unitPrice,
            quantity: 1
          });
        }
      } else {
        explodedItems.push(item);
      }
    });
    
    if (explodedItems.length !== data.items.length) {
       setData(prev => ({ ...prev, items: explodedItems }));
    }
  }, []);

  const handleUpdateItem = (index: number, field: keyof ReceiptItem, value: string | number) => {
    const newItems = [...data.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setData({ ...data, items: newItems });
  };

  const handleDeleteItem = (index: number) => {
    const newItems = data.items.filter((_, i) => i !== index);
    setData({ ...data, items: newItems });
  };

  const handleAddItem = () => {
    const newItem: ReceiptItem = {
      id: `manual-${Date.now()}`,
      name: 'Menu Baru',
      price: 0,
      quantity: 1
    };
    setData({ ...data, items: [...data.items, newItem] });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800">Cek Data Struk</h2>
        <p className="text-gray-500">Pastikan harga dan menu sudah sesuai (tanpa pembulatan).</p>
      </div>

      <Card className="space-y-6">
        <div className="grid grid-cols-2 gap-4 border-b pb-4">
             <Input 
              label="Nama Resto" 
              value={data.merchantName} 
              onChange={(e) => setData({...data, merchantName: e.target.value})}
              placeholder="Contoh: Risol Mejik"
            />
            <Input 
              label="Tanggal Order" 
              value={data.date} 
              onChange={(e) => setData({...data, date: e.target.value})}
              placeholder="Contoh: 10 December 2025"
            />
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-gray-700 border-b pb-2">Rincian Menu</h3>
          
          <div className="flex gap-2 font-medium text-gray-500 text-sm px-1">
            <div className="flex-grow">Nama Item</div>
            <div className="w-32">Harga</div>
            <div className="w-10"></div>
          </div>

          <div className="space-y-3">
            {data.items.map((item, idx) => (
              <div key={item.id} className="flex gap-2 items-start">
                <div className="flex-grow">
                  <Input 
                    value={item.name} 
                    onChange={(e) => handleUpdateItem(idx, 'name', e.target.value)}
                    placeholder="Nama Menu"
                  />
                </div>
                <div className="w-32">
                  <Input 
                    type="text"
                    leftAddon="Rp"
                    value={formatThousands(item.price)}
                    onChange={(e) => handleUpdateItem(idx, 'price', parseThousands(e.target.value))}
                    placeholder="0"
                  />
                </div>
                <button 
                  onClick={() => handleDeleteItem(idx)}
                  className="p-2 mt-0.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            <Button variant="outline" onClick={handleAddItem} className="w-full flex items-center justify-center gap-2 mt-2">
              <Plus size={16} /> Tambah Menu
            </Button>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-semibold text-gray-700">Rincian Biaya Lain</h3>
          <div className="grid grid-cols-2 gap-4">
             <Input 
              label="Diskon (Total)" 
              type="text"
              leftAddon="Rp"
              value={formatThousands(data.totalDiscount)} 
              onChange={(e) => setData({...data, totalDiscount: parseThousands(e.target.value)})}
            />
            <Input 
              label="Fee Ongkir & App" 
              type="text"
              leftAddon="Rp"
              value={formatThousands(data.deliveryFee + data.serviceFee + data.tax)} 
              onChange={(e) => {
                const val = parseThousands(e.target.value);
                setData({
                  ...data,
                  deliveryFee: val,
                  serviceFee: 0,
                  tax: 0
                });
              }}
            />
          </div>
        </div>
      </Card>

      <div className="flex gap-3 pt-4">
        <Button variant="secondary" onClick={onBack} className="w-full">
          Upload Ulang
        </Button>
        <Button onClick={() => onConfirm(data)} className="w-full">
          Lanjut ke Pembagian
        </Button>
      </div>
    </div>
  );
};