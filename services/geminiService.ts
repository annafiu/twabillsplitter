import { GoogleGenAI, Type } from "@google/genai";
import { ExtractedReceiptData } from "../types";

// Helper to convert File to Base64
export const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (!base64String) {
          reject(new Error("Failed to read file"));
          return;
      }
      const base64Data = base64String.split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const analyzeReceipt = async (file: File): Promise<ExtractedReceiptData> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const imagePart = await fileToGenerativePart(file);

  const MAX_RETRIES = 3;
  let lastError: any;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: {
          parts: [
            imagePart,
            {
              text: `Analyze this food delivery or restaurant receipt. Extract details:
              1. Merchant/Restaurant Name.
              2. Date (DD Month YYYY).
              3. Items (name, price, quantity).
              4. Subtotal, Total Discount (positive), Delivery Fee, Service Fee.
              5. TAX/PB1: Look specifically for Tax or PB1. If it's a percentage (e.g. 10%), extract that percentage. If it's only a nominal amount, extract that.
              
              CRITICAL RULES FOR IDR PRICES:
              - DO NOT ROUND ANY VALUES. Extract exactly as written.
              - Thousands separator is usually dot (.), decimals usually comma (,).
              - NEVER truncate zeros. 
              - RETURN RAW NUMBERS ONLY in the JSON.`,
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              merchantName: { type: Type.STRING },
              date: { type: Type.STRING },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    price: { type: Type.NUMBER },
                    quantity: { type: Type.INTEGER },
                  },
                  required: ["name", "price", "quantity"],
                },
              },
              subtotal: { type: Type.NUMBER },
              totalDiscount: { type: Type.NUMBER },
              deliveryFee: { type: Type.NUMBER },
              serviceFee: { type: Type.NUMBER },
              tax: { type: Type.NUMBER, description: "Nominal tax amount or percentage (e.g. 0.1 for 10%)" },
            },
            required: ["merchantName", "date", "items", "subtotal", "totalDiscount", "deliveryFee", "serviceFee", "tax"],
          },
        },
      });

      const text = response.text;
      if (!text) throw new Error("No response from AI");

      let cleanText = text.trim();
      if (cleanText.startsWith('```')) {
          cleanText = cleanText.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '');
      }

      const data = JSON.parse(cleanText);

      let multiplier = 1;
      const checkSubtotal = data.subtotal || 0;
      if (checkSubtotal > 0 && checkSubtotal < 1000) {
         multiplier = 1000;
      }

      const fixPrice = (val: number | undefined) => (val || 0) * multiplier;

      // Handle tax percentage if it looks like a small decimal (e.g. 0.1) 
      // but only if multiplier hasn't already scaled it wrongly.
      let finalTax = data.tax || 0;
      if (finalTax > 0 && finalTax <= 1) {
          // This is likely a percentage (e.g. 0.1 for 10%), keep it as nominal later
          finalTax = Math.round(data.subtotal * finalTax);
      } else {
          finalTax = fixPrice(finalTax);
      }

      const items = (data.items || []).map((item: any, index: number) => ({
        ...item,
        price: fixPrice(item.price),
        id: `item-${index}-${Date.now()}`,
      }));

      return {
        merchantName: data.merchantName || "Unknown Merchant",
        date: data.date || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
        items,
        subtotal: fixPrice(data.subtotal),
        totalDiscount: fixPrice(data.totalDiscount),
        deliveryFee: fixPrice(data.deliveryFee),
        serviceFee: fixPrice(data.serviceFee),
        tax: finalTax,
      };

    } catch (error: any) {
        lastError = error;
        const errorMessage = typeof error === 'string' ? error : (error.message || JSON.stringify(error));
        const isTransient = errorMessage.includes('503') || errorMessage.includes('overloaded') || errorMessage.includes('UNAVAILABLE');
        if (isTransient && attempt < MAX_RETRIES - 1) {
            await delay(2000 * Math.pow(2, attempt));
            continue;
        }
        break;
    }
  }

  throw new Error("Gagal menganalisa struk. Coba lagi nanti.");
};