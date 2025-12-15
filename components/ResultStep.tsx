import React, { useMemo, useRef, useState } from 'react';
import { ExtractedReceiptData, Person, Assignment } from '../types';
import { Button, Card, formatRupiah, LoadingSpinner } from './UI';
import { ArrowLeft, Share2, Download, FileImage, FileText } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface ResultStepProps {
  data: ExtractedReceiptData;
  people: Person[];
  assignments: Assignment[];
  onReset: () => void;
}

export const ResultStep: React.FC<ResultStepProps> = ({ data, people, assignments, onReset }) => {
  const tableRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const result = useMemo(() => {
    // 1. Calculate base subtotal from verified items to be safe
    const calculatedSubtotal = data.items.reduce((acc, item) => acc + item.price, 0);
    const subtotal = calculatedSubtotal || data.subtotal || 1; // Prevent div by zero

    // 2. Identify active participants (who has items)
    const activePersonIds = new Set(assignments.map(a => a.personId));
    const activePeopleCount = activePersonIds.size;

    // 3. Calculate fixed fees per person
    const totalFixedFees = data.deliveryFee + data.serviceFee;
    const feePerPerson = activePeopleCount > 0 ? totalFixedFees / activePeopleCount : 0;

    // 4. Group by Person
    const personResults = people
      .filter(p => activePersonIds.has(p.id))
      .map(person => {
        // Find items for this person
        const personItemIds = assignments.filter(a => a.personId === person.id).map(a => a.itemId);
        const personItems = data.items.filter(item => personItemIds.includes(item.id));

        const personSubtotal = personItems.reduce((acc, item) => acc + item.price, 0);
        
        // Proportional Discount: (PersonSubtotal / TotalSubtotal) * TotalDiscount
        const personDiscount = (personSubtotal / subtotal) * data.totalDiscount;

        // Proportional Tax: (PersonSubtotal / TotalSubtotal) * TotalTax
        const personTax = (personSubtotal / subtotal) * data.tax;

        const total = personSubtotal - personDiscount + personTax + feePerPerson;

        return {
          person,
          items: personItems,
          subtotal: personSubtotal,
          discount: personDiscount,
          tax: personTax,
          fee: feePerPerson,
          total
        };
      });

    const totalCalculated = personResults.reduce((acc, p) => acc + p.total, 0);

    return { personResults, totalCalculated };
  }, [data, people, assignments]);

  const copyToClipboard = () => {
    let text = `*Split Bill: ${data.merchantName}*\n`;
    text += `*Date: ${data.date}*\n\n`;
    result.personResults.forEach(r => {
      text += `${r.person.name}: ${formatRupiah(r.total)}\n`;
    });
    text += `\nTotal: ${formatRupiah(result.totalCalculated)}`;
    
    navigator.clipboard.writeText(text);
    alert('Ringkasan berhasil disalin!');
  };

  const handleDownloadImage = async () => {
    if (!tableRef.current) return;
    setIsDownloading(true);
    try {
      // useCORS: true is essential for the external image to be captured
      const canvas = await html2canvas(tableRef.current, { 
        scale: 2, 
        backgroundColor: '#ffffff',
        useCORS: true 
      });
      const link = document.createElement('a');
      link.download = `TWA-${data.merchantName}-${data.date}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      link.click();
    } catch (err) {
      console.error(err);
      alert('Gagal mendownload gambar. Coba lagi.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!tableRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(tableRef.current, { 
        scale: 2, 
        backgroundColor: '#ffffff',
        useCORS: true
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.9);
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'JPEG', 0, 10, pdfWidth, pdfHeight);
      pdf.save(`TWA-${data.merchantName}-${data.date}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Gagal mendownload PDF.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <button onClick={onReset} className="flex items-center text-gray-600 hover:text-emerald-600">
          <ArrowLeft className="mr-2" size={20} /> Buat Baru
        </button>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={copyToClipboard} className="flex items-center gap-2 text-sm">
            <Share2 size={16} /> <span className="hidden sm:inline">Copy Teks</span>
          </Button>
          <Button variant="outline" onClick={handleDownloadImage} disabled={isDownloading} className="flex items-center gap-2 text-sm">
             {isDownloading ? <LoadingSpinner /> : <FileImage size={16} />} 
             <span className="hidden sm:inline">Simpan JPG</span>
             <span className="sm:hidden">JPG</span>
          </Button>
          <Button variant="outline" onClick={handleDownloadPDF} disabled={isDownloading} className="flex items-center gap-2 text-sm">
             {isDownloading ? <LoadingSpinner /> : <FileText size={16} />}
             <span className="hidden sm:inline">Simpan PDF</span>
             <span className="sm:hidden">PDF</span>
          </Button>
        </div>
      </div>

      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Hasil Pembagian</h2>
      </div>

      {/* Wrapper for capture */}
      <div ref={tableRef} className="bg-white p-4 rounded-xl shadow-lg border border-gray-200">
        <div className="mb-4 text-center border-b pb-4">
            <h3 className="font-bold text-xl text-emerald-800">{data.merchantName} - {data.date}</h3>
            <p className="text-gray-500 text-sm">Rincian Split Bill</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-white uppercase bg-emerald-800">
              <tr>
                <th scope="col" className="px-6 py-3 rounded-tl-lg">Nama</th>
                <th scope="col" className="px-6 py-3">Menu</th>
                <th scope="col" className="px-6 py-3 text-right">Harga</th>
                <th scope="col" className="px-6 py-3 text-right">Disc</th>
                {data.tax > 0 && <th scope="col" className="px-6 py-3 text-right">Tax</th>}
                <th scope="col" className="px-6 py-3 text-right">Fee & Ongkir</th>
                <th scope="col" className="px-6 py-3 text-right rounded-tr-lg bg-emerald-700">Total</th>
              </tr>
            </thead>
            <tbody>
              {result.personResults.map((res, idx) => (
                <tr key={res.person.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900 align-top">
                    {res.person.name}
                  </td>
                  <td className="px-6 py-4">
                    {res.items.map(i => (
                      <div key={i.id} className="text-xs mb-1">{i.name}</div>
                    ))}
                  </td>
                  <td className="px-6 py-4 text-right align-top">
                    {formatRupiah(res.subtotal)}
                  </td>
                  <td className="px-6 py-4 text-right text-red-500 align-top">
                    -{formatRupiah(res.discount)}
                  </td>
                  {data.tax > 0 && (
                     <td className="px-6 py-4 text-right text-orange-600 align-top">
                     +{formatRupiah(res.tax)}
                   </td>
                  )}
                  <td className="px-6 py-4 text-right text-blue-600 align-top">
                    {formatRupiah(res.fee)}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-gray-900 bg-emerald-50 align-top">
                    {formatRupiah(res.total)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-100 font-semibold text-gray-900">
              <tr>
                <td colSpan={2} className="px-6 py-3 text-right">TOTAL</td>
                <td className="px-6 py-3 text-right">
                  {formatRupiah(data.subtotal)}
                </td>
                <td className="px-6 py-3 text-right text-red-500">
                  -{formatRupiah(data.totalDiscount)}
                </td>
                {data.tax > 0 && (
                    <td className="px-6 py-3 text-right text-orange-600">
                    +{formatRupiah(data.tax)}
                  </td>
                )}
                <td className="px-6 py-3 text-right text-blue-600">
                  {formatRupiah(data.deliveryFee + data.serviceFee)}
                </td>
                <td className="px-6 py-3 text-right bg-emerald-100">
                  {formatRupiah(result.totalCalculated)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col items-center justify-center gap-4">
            <div className="flex items-center gap-2 justify-center opacity-70">
                <img 
                    crossOrigin="anonymous"
                    src="https://i.ibb.co.com/n8RmLmmM/LOGO.jpg" 
                    alt="Logo" 
                    className="h-5 w-5 rounded object-contain mix-blend-multiply"
                />
                <div className="text-xs text-gray-500 font-medium">
                    Dihitung dengan TWA BillSplitter
                </div>
            </div>
            {/* Added crossOrigin="anonymous" to ensure html2canvas can capture it if server supports it */}
            <img 
               crossOrigin="anonymous"
               src="https://i.ibb.co.com/qMpmxMWq/Screenshot-2025-12-15-093652.jpg" 
               alt="Jangan lupa bayar" 
               className="mix-blend-multiply max-w-[200px] w-full opacity-90"
            />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mt-8">
        <Card className="bg-emerald-50 border-emerald-100">
           <h3 className="font-semibold text-emerald-800 mb-2">Metode Perhitungan</h3>
           <ul className="text-sm text-emerald-700 space-y-1 list-disc pl-4">
             <li>Harga Menu: Sesuai harga asli di struk.</li>
             <li>Diskon: Proporsional <code>(HargaMenu / Subtotal) × TotalDiskon</code>.</li>
             <li>Delivery & Fee: Dibagi rata <code>TotalFee / JumlahOrang</code>.</li>
             {data.tax > 0 && <li>Pajak: Proporsional <code>(HargaMenu / Subtotal) × TotalPajak</code>.</li>}
           </ul>
        </Card>
      </div>
    </div>
  );
};