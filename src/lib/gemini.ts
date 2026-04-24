import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const models = {
  flash: "gemini-3-flash-preview",
  pro: "gemini-3.1-pro-preview",
};

export async function evaluateSkill(task: string, response: string, round: number) {
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

  return JSON.parse(result.text);
}

export async function generateInquiryTask() {
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

  return JSON.parse(result.text);
}
