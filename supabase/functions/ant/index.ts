// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// import { InferenceClient } from "npm:@huggingface/inference";

// const client = new InferenceClient(Deno.env.get("HUG_API_KEY")!);

import Groq from "npm:groq-sdk";

const groqClient = new Groq({ apiKey: Deno.env.get("GROQ_API_KEY") });

console.log("Hello from Functions!");

Deno.serve(async (req) => {
  const { prompt } = await req.json();

  // const msg = await client.chatCompletion({
  //   provider: "fireworks-ai",
  //   model: "deepseek-ai/DeepSeek-V3-0324",
  //   messages: [
  //     {
  //       role: "system",
  //       content:
  //         "Only output one paragraph with no new lines with the summary.",
  //     },
  //     {
  //       role: "user",
  //       content: prompt,
  //     },
  //   ],
  //   max_tokens: 500,
  // });

  // console.log(msg.choices[0].message);

  const msg = await groqClient.chat.completions
    .create({
      messages: [
        {
          role: "system",
          content:
            "Summarize clearly in one paragraph. Do not introduce your response.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama3-70b-8192",
      max_tokens: 500,
    });

  console.log(msg.choices[0].message);

  return new Response(
    JSON.stringify({ msg }),
    { headers: { "Content-Type": "application/json" } },
  );
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  `curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/ant' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"prompt": "What is the capital of France?"}'`

*/
