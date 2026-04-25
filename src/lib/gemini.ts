import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const models = {
  flash: "gemini-3-flash-preview",
  pro: "gemini-3.1-pro-preview",
};

export async function evaluateSkill(task: string, response: string, round: number) {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === '') {
    throw new Error('AI service is currently unavailable. Please contact support or check your configuration.');
  }

  try {
    const prompt = `
      Evaluate the following candidate response for Round ${round} (${task}).
      
      Candidate Response:
      ${response}
      
      Provide a score (0-100), feedback for the candidate, and a internal analysis for the recruiter.
      Return the result in JSON format.
    `;

    const result = await ai.models.generateContent({
      model: models.flash,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            feedback: { type: Type.STRING },
            analysis: { type: Type.STRING },
            metrics: {
              type: Type.OBJECT,
              properties: {
                creativity: { type: Type.NUMBER },
                technical: { type: Type.NUMBER },
                criticalThinking: { type: Type.NUMBER },
                communication: { type: Type.NUMBER },
              }
            }
          },
          required: ["score", "feedback", "analysis", "metrics"]
        }
      }
    });

    if (!result.text) {
      throw new Error('Received an empty response from the AI service. Please try again.');
    }

    return JSON.parse(result.text);
  } catch (error: any) {
    console.error('Gemini evaluation error:', error);
    
    // Specific error mapping
    if (error.message?.includes('429') || error.message?.includes('quota')) {
      throw new Error('The AI evaluation service is experiencing high traffic. Please wait a moment before trying again.');
    }
    if (error.message?.includes('403') || error.message?.includes('API_KEY_INVALID')) {
      throw new Error('AI configuration error. The system administrator needs to verify the API credentials.');
    }
    if (error.message?.includes('safety')) {
      throw new Error('Your response triggered content safety filters. Please refine your submission and try again.');
    }
    
    throw new Error('We encountered an unexpected issue during the AI assessment. Your progress has been saved.');
  }
}

export async function generateInquiryTask() {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === '') {
    throw new Error('AI generation is currently disabled. Please check your setup.');
  }

  try {
    const prompt = `
      Generate an "Incomplete Question" for a high-level job assessment.
      The goal is to provide a scenario with missing critical information.
      The candidate should be evaluated on the quality and depth of questions they ask to complete the picture.
      
      Example: "We need to scale our database by 10x before next quarter." (Missing: current load, budget, stack, team size).
      
      Return a JSON with the 'scenario' and 'criticalMissingPoints' (array).
    `;

    const result = await ai.models.generateContent({
      model: models.flash,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scenario: { type: Type.STRING },
            criticalMissingPoints: {
               type: Type.ARRAY,
               items: { type: Type.STRING }
            }
          },
          required: ["scenario", "criticalMissingPoints"]
        }
      }
    });

    if (!result.text) {
       throw new Error('Failed to generate assessment task. Please refresh the page.');
    }

    return JSON.parse(result.text);
  } catch (error: any) {
    console.error('Gemini task generation error:', error);
    
    if (error.message?.includes('429')) {
      throw new Error('Service is busy generating assessments. Please try again in 30 seconds.');
    }
    
    throw new Error('Failed to generate assessment task due to a technical error.');
  }
}
