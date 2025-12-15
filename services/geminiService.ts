import { GoogleGenAI, Type } from "@google/genai";
import { ExtractedReceiptData } from "../types";

// Helper to convert File to Base64
export const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:image/jpeg;base64,")
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

export const analyzeReceipt = async (file: File): Promise<ExtractedReceiptData> => {
  // Initialize AI here to ensure it uses the current env var and doesn't crash app load if key is missing
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const imagePart = await fileToGenerativePart(file);

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
          
          Return raw JSON.`,
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

  const data = JSON.parse(text);

  // Post-processing to add IDs and ensure safety
  const items = data.items.map((item: any, index: number) => ({
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
};