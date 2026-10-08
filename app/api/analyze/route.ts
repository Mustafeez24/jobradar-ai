import { NextRequest, NextResponse } from "next/server";

const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const NVIDIA_MODEL = "nvidia/nemotron-3-ultra-550b-a55b";
const MAX_RETRIES = 3;
const RETRY_STATUS_CODES = new Set([429, 503]);
const FETCH_TIMEOUT_MS = 90000;
const MAX_DESCRIPTION_LENGTH = 3000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  apiKey: string
): Promise<Response> {
  let lastResponse: Response | null = null;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  
  try {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          "Authorization": `Bearer ${apiKey}`,
        },
        signal: controller.signal,
      });
      
      lastResponse = response;
      
      if (response.ok || !RETRY_STATUS_CODES.has(response.status)) {
        return response;
      }
      
      if (attempt < MAX_RETRIES) {
        const delay = 1000 * Math.pow(2, attempt - 1);
        console.warn(`Nemotron API returned ${response.status}, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`);
        await sleep(delay);
      }
    }
    
    return lastResponse!;
  } finally {
    clearTimeout(timeoutId);
  }
}

interface UserProfile {
  role: string;
  experience: string;
  skills: string;
}

interface JobData {
  title: string;
  company: string;
  location: string;
  description?: string;
  highlights?: {
    Qualifications?: string[];
    Responsibilities?: string[];
    Benefits?: string[];
  };
  salary?: string;
  experience?: string;
  jobType?: string;
}

interface AnalysisResult {
  matchScore: number;
  recommendation: string;
  matchingSkills: string[];
  missingSkills: string[];
  whyApply: string;
  whySkip: string;
  interviewQuestions: string[];
  prepPlan: string[];
}

const DEFAULT_ANALYSIS: AnalysisResult = {
  matchScore: 0,
  recommendation: "Unable to analyze",
  matchingSkills: [],
  missingSkills: [],
  whyApply: "Analysis unavailable. Please try again later.",
  whySkip: "",
  interviewQuestions: [],
  prepPlan: [],
};

function buildPrompt(profile: UserProfile, job: JobData): string {
  const jobRequirements = job.highlights?.Qualifications?.join("\n- ") || "Not specified";
  const jobResponsibilities = job.highlights?.Responsibilities?.join("\n- ") || "Not specified";
  let jobDescription = job.description || "Not provided";

  if (jobDescription.length > MAX_DESCRIPTION_LENGTH) {
    jobDescription = jobDescription.slice(0, MAX_DESCRIPTION_LENGTH) + "... [truncated]";
  }

  return `You are an expert career coach and technical recruiter. Analyze how well a candidate matches a job posting and provide a structured assessment.

CANDIDATE PROFILE:
- Target Role: ${profile.role}
- Experience Level: ${profile.experience || "Not specified"}
- Skills: ${profile.skills || "Not specified"}

JOB POSTING:
- Title: ${job.title}
- Company: ${job.company}
- Location: ${job.location}
- Salary: ${job.salary || "Not specified"}
- Experience Required: ${job.experience || "Not specified"}
- Job Type: ${job.jobType || "Not specified"}

JOB DESCRIPTION:
${jobDescription}

KEY QUALIFICATIONS/REQUIREMENTS:
- ${jobRequirements}

KEY RESPONSIBILITIES:
- ${jobResponsibilities}

Provide your analysis as a valid JSON object with exactly these fields:
{
  "matchScore": <integer 0-100>,
  "recommendation": "<Highly Recommended|Recommended|Consider|Not Recommended>",
  "matchingSkills": ["skill1", "skill2", ...],
  "missingSkills": ["skill1", "skill2", ...],
  "whyApply": "<2-3 sentences explaining why the candidate should apply>",
  "whySkip": "<1-2 sentences explaining concerns, or empty string if none>",
  "interviewQuestions": ["question1", "question2", "question3", "question4", "question5"],
  "prepPlan": ["action1", "action2", "action3", "action4"]
}

Guidelines:
- matchScore must be 0-100 based on skill overlap, experience match, and role fit
- recommendation must be one of the four exact values
- matchingSkills: skills the candidate has that match job requirements
- missingSkills: important skills from job that candidate lacks
- whyApply: specific, encouraging, mention concrete matches
- whySkip: honest but constructive, mention specific gaps
- interviewQuestions: 5 technical/behavioral questions tailored to this role
- prepPlan: 4 actionable preparation steps for this specific role

Return ONLY the JSON object, no markdown, no extra text.`;
}

function extractJsonFromResponse(text: string): string {
  const trimmed = text.trim();
  
  // Try to find JSON in markdown code fences first
  const codeFenceMatch = trimmed.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (codeFenceMatch) {
    return codeFenceMatch[1];
  }
  
  // Try to find JSON object (first { to last })
  const jsonStart = trimmed.indexOf("{");
  const jsonEnd = trimmed.lastIndexOf("}");
  
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    return trimmed.slice(jsonStart, jsonEnd + 1);
  }
  
  throw new Error("No JSON object found in response");
}

function parseAnalysisResponse(text: string): AnalysisResult {
  try {
    const jsonText = extractJsonFromResponse(text);
    const parsed = JSON.parse(jsonText);

    return {
      matchScore: Math.max(0, Math.min(100, Math.round(Number(parsed.matchScore) || 0))),
      recommendation: ["Highly Recommended", "Recommended", "Consider", "Not Recommended"].includes(parsed.recommendation)
        ? parsed.recommendation
        : "Consider",
      matchingSkills: Array.isArray(parsed.matchingSkills) ? parsed.matchingSkills.filter((s: unknown) => typeof s === "string") : [],
      missingSkills: Array.isArray(parsed.missingSkills) ? parsed.missingSkills.filter((s: unknown) => typeof s === "string") : [],
      whyApply: typeof parsed.whyApply === "string" ? parsed.whyApply : "Analysis incomplete.",
      whySkip: typeof parsed.whySkip === "string" ? parsed.whySkip : "",
      interviewQuestions: Array.isArray(parsed.interviewQuestions) ? parsed.interviewQuestions.filter((s: unknown) => typeof s === "string").slice(0, 5) : [],
      prepPlan: Array.isArray(parsed.prepPlan) ? parsed.prepPlan.filter((s: unknown) => typeof s === "string").slice(0, 4) : [],
    };
  } catch (error) {
    console.error("Failed to parse Nemotron response:", error);
    console.error("Raw response (first 500 chars):", text.slice(0, 500));
    return DEFAULT_ANALYSIS;
  }
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.NVIDIA_API_KEY;
  
  if (!apiKey) {
    console.error("NVIDIA_API_KEY is undefined - check .env.local and restart dev server");
    return NextResponse.json(
      { error: "Nemotron API key not configured. Ensure NVIDIA_API_KEY is set in .env.local and restart the dev server." },
      { status: 500 }
    );
  }
  
  if (apiKey === "your-nvidia-api-key-here" || apiKey.trim() === "") {
    return NextResponse.json(
      { error: "Nemotron API key is a placeholder. Replace with real key in .env.local" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { profile, job } = body;

    if (!profile || !job) {
      return NextResponse.json(
        { error: "Both profile and job are required" },
        { status: 400 }
      );
    }

    if (!profile.role || !job.title) {
      return NextResponse.json(
        { error: "Profile role and job title are required" },
        { status: 400 }
      );
    }

    const prompt = buildPrompt(profile, job);

    const response = await fetchWithRetry(NVIDIA_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: NVIDIA_MODEL,
        messages: [
          {
            role: "system",
            content: "You are an expert career coach and technical recruiter. Provide structured JSON analysis only."
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        top_p: 0.9,
      }),
    }, apiKey);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Nemotron API error:", response.status, errorText);
      
      if (response.status === 503) {
        return NextResponse.json(
          { error: "Nemotron service is temporarily overloaded. Please try again in a few moments." },
          { status: 503 }
        );
      }
      
      if (RETRY_STATUS_CODES.has(response.status)) {
        return NextResponse.json(
          { error: "Nemotron is temporarily busy. Please try again in a moment." },
          { status: 503 }
        );
      }
      
      return NextResponse.json(
        { error: `Nemotron API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    if (!content) {
      return NextResponse.json(
        { error: "Empty response from Nemotron" },
        { status: 500 }
      );
    }

    const analysis = parseAnalysisResponse(content);

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error("Analysis error:", error);
    
    if (error instanceof Error && error.name === "TimeoutError") {
      return NextResponse.json(
        { error: "Analysis timed out. Please try again." },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}