import React, { useState, useEffect } from 'react';
import { ExtractedReceiptData, ReceiptItem } from '../types';
import { Button, Card, Input, formatRupiah } from './UI';
import { Plus, Trash2, Percent } from 'lucide-react';

interface VerifyStepProps {
  initialData: ExtractedReceiptData;
  onConfirm: (data: ExtractedReceiptData) => void;
  onBack: () => void;
}

export const VerifyStep: React.FC<VerifyStepProps> = ({ initialData, onConfirm, onBack }) => {
  const [data, setData] = useState<ExtractedReceiptData>(initialData);
  const [taxPercent, setTaxPercent] = useState<number>(0);

  // Auto-calculate tax percentage from nominal if possible on initial load
  useEffect(() => {
    if (initialData.tax > 0 && initialData.subtotal > 0) {
      const p = (initialData.tax / initialData.subtotal) * 100;
      // Common tax rates are 10%, 11%, 5%. Let's check if it's close to one.
      if (Math.abs(p - 10) < 0.5) setTaxPercent(10);
      else if (Math.abs(p - 11) < 0.5) setTaxPercent(11);
      else setTaxPercent(parseFloat(p.toFixed(2)));
    }
  }, [initialData]);

  // Sync tax percentage to nominal
  const handleTaxPercentChange = (val: string) => {
    const p = parseFloat(val) || 0;
    setTaxPercent(p);
    const nominal = (p / 100) * data.subtotal;
    setData(prev => ({ ...prev, tax: nominal }));
  };

  const formatThousands = (val: number) => {
    if (val === undefined || val === null) return '';
    return val.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  const parseThousands = (val: string) => {
    const clean = val.replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.]/g, '');
    return parseFloat(clean) || 0;
  };

  useEffect(() => {
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
    const newSubtotal = newItems.reduce((acc, item) => acc + item.price, 0);
    
    // If tax is based on percentage, update nominal tax when subtotal changes
    const newTax = (taxPercent / 100) * newSubtotal;
    setData({ ...data, items: newItems, subtotal: newSubtotal, tax: newTax });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800">Cek Data Struk</h2>
        <p className="text-gray-500">Pastikan rincian pajak & biaya sudah sesuai.</p>
      </div>

      <Card className="space-y-6">
        <div className="grid grid-cols-2 gap-4 border-b pb-4">
             <Input 
              label="Nama Resto" 
              value={data.merchantName} 
              onChange={(e) => setData({...data, merchantName: e.target.value})}
            />
            <Input 
              label="Tanggal" 
              value={data.date} 
              onChange={(e) => setData({...data, date: e.target.value})}
            />
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-gray-700 border-b pb-2">Rincian Menu</h3>
          <div className="space-y-3">
            {data.items.map((item, idx) => (
              <div key={item.id} className="flex gap-2 items-start">
                <div className="flex-grow">
                  <Input 
                    value={item.name} 
                    onChange={(e) => handleUpdateItem(idx, 'name', e.target.value)}
                  />
                </div>
                <div className="w-32">
                  <Input 
                    leftAddon="Rp"
                    value={formatThousands(item.price)}
                    onChange={(e) => handleUpdateItem(idx, 'price', parseThousands(e.target.value))}
                  />
                </div>
                <button onClick={() => {
                  const items = data.items.filter((_, i) => i !== idx);
                  const sub = items.reduce((a, b) => a + b.price, 0);
                  setData({...data, items, subtotal: sub, tax: (taxPercent/100)*sub});
                }} className="p-2 mt-1 text-red-500"><Trash2 size={18} /></button>
              </div>
            ))}
            <Button variant="outline" onClick={() => setData({...data, items: [...data.items, {id:Date.now().toString(), name:'', price:0, quantity:1}]})} className="w-full">
              + Tambah Menu
            </Button>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-semibold text-gray-700">Rincian Biaya Lain</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Diskon" 
              leftAddon="Rp"
              value={formatThousands(data.totalDiscount)} 
              onChange={(e) => setData({...data, totalDiscount: parseThousands(e.target.value)})}
            />
            <Input 
              label="Pajak (%)" 
              type="number"
              leftAddon="%"
              value={taxPercent} 
              onChange={(e) => handleTaxPercentChange(e.target.value)}
              helperText={`Nominal: ${formatRupiah(data.tax)}`}
            />
             <Input 
              label="Pajak (Nominal)" 
              leftAddon="Rp"
              value={formatThousands(data.tax)} 
              onChange={(e) => {
                const nominal = parseThousands(e.target.value);
                setData({...data, tax: nominal});
                if (data.subtotal > 0) setTaxPercent(parseFloat(((nominal/data.subtotal)*100).toFixed(2)));
              }}
            />
            <Input 
              label="Ongkir & Fee" 
              leftAddon="Rp"
              value={formatThousands(data.deliveryFee + data.serviceFee)} 
              onChange={(e) => setData({...data, deliveryFee: parseThousands(e.target.value), serviceFee: 0})}
            />
          </div>
        </div>
      </Card>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack} className="w-full">Kembali</Button>
        <Button onClick={() => onConfirm(data)} className="w-full">Lanjut Pembagian</Button>
      </div>
    </div>
  );
};