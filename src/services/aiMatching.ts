import { GoogleGenerativeAI } from "@google/generative-ai";
import { UserProfile, Job, Assessment } from "../types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface MatchResult {
  score: number;
  reasoning: string;
  strengths: string[];
  gaps: string[];
  skillAnalysis: {
    skill: string;
    gap: boolean;
    insight: string;
  }[];
  assessmentInsights: string[];
}

export async function calculateJobFit(candidate: UserProfile, assessments: Assessment[], job: Job): Promise<MatchResult> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const candidateProfile = {
    name: candidate.displayName,
    skills: Object.values(candidate.skills).map(s => `${s.name} (${s.level}, score: ${s.score})`),
    assessments: assessments.map(a => ({
      round: a.round,
      type: a.type,
      score: a.aiEvaluation?.score,
      analysis: a.aiEvaluation?.analysis || a.aiEvaluation?.feedback
    }))
  };

  const prompt = `
    As a technical recruiting AI, evaluate the fit between this candidate and job posting. 
    Provide a deep, critical analysis based on their skill DNA and verified proof points (assessments).

    JOB:
    Title: ${job.title}
    Description: ${job.description}
    Required Skills: ${job.requiredSkills.join(', ')}
    
    CANDIDATE PROFILE:
    ${JSON.stringify(candidateProfile, null, 2)}
    
    Return a JSON object with:
    1. score (0-100)
    2. reasoning (A deep 3-4 sentence paragraph explaining the qualitative fit)
    3. strengths (array of 3 specific key skills/traits that match)
    4. gaps (array of 2-3 specific missing skills or areas where proof is weak)
    5. skillAnalysis (array of objects for each key required skill for the job: { skill: string, gap: boolean, insight: string })
    6. assessmentInsights (array of 2 specific conclusions drawn from their verified assessment history)
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    // Extract JSON from response (sometimes Gemini returns markdown blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Invalid AI response format');
  } catch (error) {
    console.error('Job Matching Error:', error);
    return {
      score: 0,
      reasoning: "AI evaluation failed to complete.",
      strengths: [],
      gaps: [],
      skillAnalysis: [],
      assessmentInsights: []
    };
  }
}
