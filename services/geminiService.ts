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
              text: `Analyze this food delivery receipt (GoFood, GrabFood, ShopeeFood). Extract details:
              1. Merchant/Restaurant Name.
              2. Date (DD Month YYYY).
              3. Items (name, price, quantity).
              4. Subtotal, Total Discount (positive), Delivery Fee, Service Fee, Tax.
              
              CRITICAL RULES FOR IDR PRICES:
              - DO NOT ROUND ANY VALUES. Extract the exact value including any decimal parts (cents) if present.
              - In Indonesian receipts, a dot (.) is usually a thousands separator (e.g., 15.000 is 15 thousand). 
              - If you see "15.000", return 15000. If you see "7,5" or "7.5" and it clearly represents 7500, return 7500.
              - However, if there are actual cents (e.g., "15000.75"), return 15000.75.
              - NEVER truncate zeros. If a price is 5000, return 5000. 
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
                    price: { type: Type.NUMBER, description: "Exact price as written, no rounding" },
                    quantity: { type: Type.INTEGER },
                  },
                  required: ["name", "price", "quantity"],
                },
              },
              subtotal: { type: Type.NUMBER },
              totalDiscount: { type: Type.NUMBER },
              deliveryFee: { type: Type.NUMBER },
              serviceFee: { type: Type.NUMBER },
              tax: { type: Type.NUMBER },
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

      // HEURISTIC: Handle common AI confusion between thousands separator and decimal point in IDR
      // If the value is suspiciously low (< 1000) but represents a food price, it likely needs * 1000.
      let multiplier = 1;
      const checkSubtotal = data.subtotal || 0;
      if (checkSubtotal > 0 && checkSubtotal < 1000) {
         multiplier = 1000;
      }

      const fixPrice = (val: number | undefined) => (val || 0) * multiplier;

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
        tax: fixPrice(data.tax),
      };

    } catch (error: any) {
        lastError = error;
        const errorMessage = typeof error === 'string' ? error : (error.message || JSON.stringify(error));
        const isTransient = errorMessage.includes('503') || errorMessage.includes('overloaded') || errorMessage.includes('UNAVAILABLE') || (error.status === 503);
        if (isTransient && attempt < MAX_RETRIES - 1) {
            await delay(2000 * Math.pow(2, attempt));
            continue;
        }
        break;
    }
  }

  let friendlyMessage = "Gagal menghubungi AI. Model sedang sibuk, silakan coba lagi sebentar lagi.";
  if (lastError?.message) {
      try {
          if (lastError.message.includes('{"error":')) {
              const jsonMatch = lastError.message.match(/\{.*\}/);
              const jsonStr = jsonMatch ? jsonMatch[0] : lastError.message;
              const errObj = JSON.parse(jsonStr);
              if (errObj.error?.message) friendlyMessage = `AI Error: ${errObj.error.message}`;
          } else {
             friendlyMessage = lastError.message;
          }
      } catch (e) {
          friendlyMessage = lastError.message;
      }
  }
  throw new Error(friendlyMessage);
};