import { NextRequest, NextResponse } from "next/server";

const SERPAPI_KEY = process.env.SERPAPI_KEY;
const SERPAPI_BASE_URL = "https://serpapi.com/search.json";
const SERPAPI_TIMEOUT_MS = 30000;

interface SerpApiJob {
  job_id?: string;
  title?: string;
  company_name?: string;
  location?: string;
  via?: string;
  description?: string;
  job_highlights?: {
    Qualifications?: string[];
    Responsibilities?: string[];
    Benefits?: string[];
  };
  extensions?: { name: string; value: string }[];
  job_type?: string;
  detected_extensions?: {
    schedule_type?: string;
    work_from_home?: boolean;
  };
  apply_link?: string;
  posted_at?: string;
  salary?: string;
}

interface SerpApiResponse {
  jobs_results?: SerpApiJob[];
  search_metadata?: {
    status: string;
  };
  error?: string;
}

function normalizeSkills(skills: string): string[] {
  return skills
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => s.replace(/[.]+$/, ""))
    .filter((s, i, arr) => arr.indexOf(s) === i)
    .slice(0, 8);
}

function buildSearchQuery(role: string, skills: string[]): string {
  const parts = [role.trim()];

  if (skills.length > 0) {
    parts.push(skills.slice(0, 4).join(" "));
  }

  return parts.join(" ");
}

function extractSalary(extensions: { name: string; value: string }[] | undefined): string | undefined {
  if (!extensions) return undefined;
  const salaryExt = extensions.find((ext) => ext.name?.toLowerCase().includes("salary"));
  return salaryExt?.value;
}

function extractExperience(extensions: { name: string; value: string }[] | undefined): string | undefined {
  if (!extensions) return undefined;
  const expExt = extensions.find((ext) => ext.name?.toLowerCase().includes("experience"));
  return expExt?.value;
}

function extractJobType(extensions: { name: string; value: string }[] | undefined): string | undefined {
  if (!extensions) return undefined;
  const typeExt = extensions.find((ext) => ext.name?.toLowerCase().includes("type") || ext.name?.toLowerCase().includes("schedule"));
  return typeExt?.value;
}

function formatJob(job: SerpApiJob) {
  return {
    id: job.job_id,
    title: job.title,
    company: job.company_name,
    location: job.location,
    via: job.via,
    description: job.description,
    highlights: job.job_highlights,
    salary: extractSalary(job.extensions),
    experience: extractExperience(job.extensions),
    jobType: extractJobType(job.extensions) || job.job_type,
    workFromHome: job.detected_extensions?.work_from_home,
    scheduleType: job.detected_extensions?.schedule_type,
    applyLink: job.apply_link,
    postedAt: job.posted_at,
  };
}

export async function GET(request: NextRequest) {
  if (!SERPAPI_KEY) {
    return NextResponse.json(
      { error: "SerpApi key not configured" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const role = (searchParams.get("q") || searchParams.get("role") || "").trim();
  const location = (searchParams.get("location") || "").trim();
  const rawExperience = (searchParams.get("experience") || "").trim();
  const rawSkills = (searchParams.get("skills") || "").trim();

  if (!role) {
    return NextResponse.json(
      { error: "Job role (q) is required" },
      { status: 400 }
    );
  }

  const normalizedSkills = normalizeSkills(rawSkills);
  const searchQuery = buildSearchQuery(role, normalizedSkills);

  const serpApiParams = new URLSearchParams({
    engine: "google_jobs",
    q: searchQuery,
    api_key: SERPAPI_KEY,
    hl: "en",
    gl: "in",
  });

  if (location) {
    serpApiParams.set("location", location);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SERPAPI_TIMEOUT_MS);

  const startedAt = Date.now();
    console.log("SerpApi request:", {
      query: searchQuery,
      location: location || "none",
    });

    try {
      const response = await fetch(`${SERPAPI_BASE_URL}?${serpApiParams.toString()}`, {
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        next: { revalidate: 300 },
      });

      const durationMs = Date.now() - startedAt;
      console.log(`SerpApi request completed in ${durationMs}ms`, {
        query: searchQuery,
        location: location || "none",
      });

      clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("SerpApi request failed:", {
        status: response.status,
        message: errorText.slice(0, 500),
        query: searchQuery,
        location: location || "none",
      });
      return NextResponse.json(
        { error: "Failed to fetch jobs from SerpApi" },
        { status: response.status }
      );
    }

    const data: SerpApiResponse = await response.json();

    if (data.error) {
      console.error("SerpApi returned error:", {
        message: data.error,
        query: searchQuery,
        location: location || "none",
      });
      return NextResponse.json(
        { error: data.error },
        { status: 400 }
      );
    }

    const jobs = data.jobs_results?.map(formatJob) || [];

    return NextResponse.json({
      success: true,
      query: searchQuery,
      count: jobs.length,
      jobs,
    });
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === "AbortError") {
      console.error("SerpApi request timed out:", {
        query: searchQuery,
        location: location || "none",
        timeoutMs: SERPAPI_TIMEOUT_MS,
      });
      return NextResponse.json(
        { error: "Job search timed out. Please try again." },
        { status: 504 }
      );
    }

    console.error("SerpApi error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}