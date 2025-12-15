import { GoogleGenAI, Type } from "@google/genai";
import { ExtractedReceiptData } from "../types";

// Helper to convert File to Base64
export const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:image/jpeg;base64,")
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
  // Initialize AI with process.env.API_KEY directly as per guidelines.
  // The environment variable is handled by Vite define plugin.
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
              text: `Analyze this food delivery receipt image. Extract the following details:
              1. The Merchant/Restaurant Name.
              2. The Date of the order (format: DD Month YYYY, e.g., 10 December 2025).
              3. A list of items ordered. If an item has a quantity > 1 (e.g., "2x Nasi Goreng"), list it as a single entry with quantity 2.
              4. The Subtotal (total price of items before discounts/fees).
              5. Total Discount (sum of all promo codes, item discounts, delivery discounts). Return as a positive number.
              6. Delivery Fee.
              7. Service/Platform/Packaging Fees (sum them up).
              8. Tax amount.
              
              Return ONLY raw JSON, do not wrap in markdown code blocks.`,
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              merchantName: { type: Type.STRING, description: "Name of the restaurant or merchant" },
              date: { type: Type.STRING, description: "Date of order in DD Month YYYY format" },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    price: { type: Type.NUMBER, description: "Total price for this line item (unit price * quantity)" },
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

      // Clean markdown if present (just in case)
      let cleanText = text.trim();
      if (cleanText.startsWith('```')) {
          cleanText = cleanText.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '');
      }

      const data = JSON.parse(cleanText);

      // Post-processing to add IDs and ensure safety
      const items = (data.items || []).map((item: any, index: number) => ({
        ...item,
        id: `item-${index}-${Date.now()}`,
      }));

      return {
        merchantName: data.merchantName || "Unknown Merchant",
        date: data.date || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
        items,
        subtotal: data.subtotal || 0,
        totalDiscount: data.totalDiscount || 0,
        deliveryFee: data.deliveryFee || 0,
        serviceFee: data.serviceFee || 0,
        tax: data.tax || 0,
      };

    } catch (error: any) {
        lastError = error;
        // Check for 503 or 429 (Too Many Requests) or general "overloaded" message in error string
        // The error might be a stringified JSON as seen in user report, so we check valid string presence
        const errorMessage = typeof error === 'string' ? error : (error.message || JSON.stringify(error));
        const isTransient = errorMessage.includes('503') || errorMessage.includes('overloaded') || errorMessage.includes('UNAVAILABLE') || (error.status === 503);
        
        if (isTransient && attempt < MAX_RETRIES - 1) {
            // Wait with exponential backoff: 2s, 4s, 8s
            const waitTime = 2000 * Math.pow(2, attempt);
            console.warn(`Gemini API overloaded. Retrying in ${waitTime}ms... (Attempt ${attempt + 1}/${MAX_RETRIES})`);
            await delay(waitTime);
            continue;
        }
        
        // Break loop and throw if not transient or max retries reached
        break;
    }
  }

  // If we get here, it means we failed after retries
  console.error("Gemini API Error after retries:", lastError);
  
  // Try to extract a clean message
  let friendlyMessage = "Gagal menghubungi AI. Model sedang sibuk, silakan coba lagi sebentar lagi.";
  if (lastError?.message) {
      // If it's the JSON string, try to parse it to get the message
      try {
          // Check if it looks like the specific JSON error object
          if (lastError.message.includes('{"error":')) {
              // Extract JSON part if mixed with text, or parse directly
              const jsonMatch = lastError.message.match(/\{.*\}/);
              const jsonStr = jsonMatch ? jsonMatch[0] : lastError.message;
              const errObj = JSON.parse(jsonStr);
              if (errObj.error?.message) {
                  friendlyMessage = `AI Error: ${errObj.error.message}`;
              }
          } else {
             friendlyMessage = lastError.message;
          }
      } catch (e) {
          friendlyMessage = lastError.message;
      }
  }

  throw new Error(friendlyMessage);
};