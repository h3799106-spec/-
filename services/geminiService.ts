import { GoogleGenAI } from "@google/genai";

const getGeminiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please ensure process.env.API_KEY is available.");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Resizes an image to a maximum dimension while maintaining aspect ratio.
 * This helps prevent payload size errors with the API.
 */
const resizeImage = (base64Str: string, maxDimension: number = 1024): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      
      // Export as JPEG with 0.8 quality to optimize size
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => {
      // If loading fails, return original (though likely to fail API too)
      resolve(base64Str);
    };
  });
};

/**
 * Generates an edited version of the image based on the prompt using Gemini 2.5 Flash Image (Nano Banana).
 * Uses generateContent as per SDK guidelines for this specific model.
 */
export const generateThemedImage = async (base64Image: string, prompt: string): Promise<string> => {
  const ai = getGeminiClient();
  
  try {
    // Resize image to ensure it fits within typical API payload limits
    const optimizedImage = await resizeImage(base64Image, 1024);
    
    // Clean base64 string if it has the data prefix
    const cleanBase64 = optimizedImage.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
    
    // Explicitly prompt the model to generate an image to ensure correct modality
    // Nano Banana (gemini-2.5-flash-image) uses generateContent for image generation.
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: cleanBase64
              }
            },
            {
              text: `Generate a high-quality, photorealistic image based on this instruction: ${prompt}`
            }
          ]
        }
      ],
      config: {} // Empty config to avoid INVALID_ARGUMENT with unsupported parameters like aspectRatio in edit mode
    });

    // Iterate through parts to find the image
    const parts = response.candidates?.[0]?.content?.parts;
    
    if (!parts) {
      throw new Error("No content generated");
    }

    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error("No image data found in response");

  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};