import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, courseId, noteId } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Retrieve context from database
    let context = "";
    let courseName = "";
    let noteName = "";

    // Get course information
    if (courseId) {
      const { data: course, error: courseError } = await supabase
        .from("courses")
        .select("title, description, category")
        .eq("id", courseId)
        .single();

      if (course && !courseError) {
        courseName = course.title;
        context += `## Course: ${course.title}\n`;
        context += `Category: ${course.category}\n`;
        if (course.description) {
          context += `Description: ${course.description}\n\n`;
        }
      }

      // Get all notes for the course
      const { data: notes, error: notesError } = await supabase
        .from("notes")
        .select("id, title, content, file_type")
        .eq("course_id", courseId);

      if (notes && !notesError && notes.length > 0) {
        context += "## Course Notes:\n\n";
        
        for (const note of notes) {
          // If a specific note is selected, prioritize it
          if (noteId && note.id === noteId) {
            noteName = note.title;
            context = `## Selected Note: ${note.title}\n\n${note.content || "No content available"}\n\n` + context;
          } else if (note.content) {
            context += `### ${note.title}\n${note.content}\n\n`;
          }
        }
      }

      // Get lessons for additional context
      const { data: lessons, error: lessonsError } = await supabase
        .from("lessons")
        .select("title, content")
        .eq("course_id", courseId)
        .order("lesson_order", { ascending: true });

      if (lessons && !lessonsError && lessons.length > 0) {
        context += "## Lessons:\n\n";
        for (const lesson of lessons) {
          context += `### ${lesson.title}\n`;
          if (lesson.content) {
            context += `${lesson.content}\n\n`;
          }
        }
      }
    }

    // Build system prompt with RAG context
    const systemPrompt = `You are an expert AI Tutor for the Brightoria learning platform. Your role is to help students understand course materials, answer questions, and provide detailed explanations.

${context ? `## Relevant Course Materials (Use this as your knowledge base):\n\n${context}` : ""}

## Guidelines:
1. Always be helpful, patient, and encouraging
2. When answering questions, reference the course materials when relevant
3. Provide clear, step-by-step explanations
4. Include practice questions or exercises when appropriate
5. If the question is outside the course scope, acknowledge this and still try to help
6. Use markdown formatting for better readability
7. For code-related questions, provide code examples with explanations
8. If you reference something from the notes, mention the source

${courseName ? `Current Course: ${courseName}` : "No specific course selected"}
${noteName ? `Selected Note: ${noteName}` : ""}`;

    console.log("RAG Context length:", context.length);
    console.log("Sending request to Lovable AI Gateway");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("AI Tutor RAG error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
