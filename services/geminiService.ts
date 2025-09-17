import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";

export const generateRotatedImage = async (apiKey: string, base64Image: string, mimeType: string, prompt: string, temperature: number): Promise<string> => {
  if (!apiKey) {
    throw new Error("API_KEY is not provided.");
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType } },
          { text: prompt }
        ]
      },
      config: {
        temperature: temperature,
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
    if (imagePart?.inlineData) {
      const newMimeType = imagePart.inlineData.mimeType;
      const newBase64 = imagePart.inlineData.data;
      return `data:${newMimeType};base64,${newBase64}`;
    }

    const textPart = response.candidates?.[0]?.content?.parts?.find(part => part.text);
    if (textPart?.text) {
        throw new Error(`The AI did not return an image. Response: "${textPart.text}"`);
    }

    throw new Error("The AI did not return an image. It might not be able to process this request.");
  } catch(e: any) {
    // Intercept specific API key error to provide a better user message
    if (e.message?.includes('API key not valid')) {
        throw new Error("API key not valid. Please check your key.");
    }
    throw e;
  }
};