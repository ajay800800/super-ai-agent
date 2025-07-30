const fs = require("fs");
const path = require("path");
const axios = require("axios");

const CONTEXT_PATH = path.join(__dirname, "context.json");
const TOOLS_PATH = path.join(__dirname, "tools.json");

exports.routeAndForward = async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Missing or invalid prompt" });
  }

  try {
    // 🧠 Load tools and memory context
    const tools = JSON.parse(fs.readFileSync(TOOLS_PATH, "utf-8"));
    const contextHistory = JSON.parse(fs.readFileSync(CONTEXT_PATH, "utf-8") || "[]");

    const formattedTools = tools.map(tool =>
      `- ${tool.name}: ${tool.description}`
    ).join("\n");

    const contextBlock = contextHistory
      .slice(-3)
      .map(item => `User: ${item.user}\nAI: ${item.reply}`)
      .join("\n\n");

    // 📝 Prompt to route to tool
    const llmRoutingPrompt = `
You are a smart AI agent router.

Previous interactions meaning what user and your last 3 conversation was like this is for your memory purspose :
${contextBlock}

Available tools:
${formattedTools}


Instructions:
You are a smart and strict AI router agent.

Your job is to read a user's natural language prompt and decide which tools are most appropriate for solving it. You will return ONLY the tools that are truly needed — no extra or irrelevant tools.

You have access to exactly two tools:

1. **hospital_booking**
   - This is a powerful hospital appointment system.
   - It has full access to a PostgreSQL medical database.
   - It can book appointments, check availability, view doctors, handle patients, and return doctor/patient info.
   - If the user mentions doctors, hospitals, booking, slots, time, patients, availability, or anything medical — this tool is required.

2. **email_handling **
   - This is an advanced email-sending  and reader system.
   - It can send personalized or automated emails to anyone.
   - Use this only if the user says things like "send email", "notify", "email the doctor", "inform", "mail me", or similar.
  3.simple llm tool for general queryy or default if not suitable toool found 
  
  4.doctumnet extractor whihc extract text from any type of documnet 
  5.coder writer which writes code in any language and save it .

🔒 Rules:
- Carefully read the user's full intent.
- Based on your understanding, return a **JSON array** with one or both of the following tools:
  [
    { "tool": "hospital_booking" },
    { "tool": "email_sending" }
  ]
- If only one tool is needed, include just that one.
- ❌ DO NOT include extra tools.
- ❌ DO NOT include anything outside the JSON array.
- ❌ DO NOT write markdown, explanation, or extra text.

🧠 Be thoughtful, precise, and accurate. A mistake could result in incorrect routing.

Your ONLY job is to return the correct tool(s) to run based on the user’s prompt.
User query:
"${prompt}"


`;

    // 🔁 Ask Mistral (via Ollama)
    const llmRoutingResponse = await axios.post("http://localhost:11434/api/generate", {
      model: "mistral",
      prompt: `<s>[INST] ${llmRoutingPrompt} [/INST]`,
      stream: false
    });

    let responseText = llmRoutingResponse.data?.response || '';
    responseText = responseText.replace(/```json|```/gi, '').trim();

    // ✅ Parse JSON
    let toolCalls;
    try {
      toolCalls = JSON.parse(responseText);
      if (!Array.isArray(toolCalls)) {
        return res.status(400).json({ error: "LLM did not return a valid JSON array", raw: responseText });
      }
    } catch (e) {
      return res.status(400).json({ error: "Invalid JSON from LLM", raw: responseText });
    }

   const { exec } = require("child_process");

const results = [];
const routeMap = {
  hospital_booking: "http://localhost:3007/api/ask-llm",
  email_handling: "http://localhost:3088/agent",
  simple_llm: "local",
  doc_extractor: "http://localhost:5000/extract-text",
  coder: "http://localhost:5005/run",
};

for (const { tool } of toolCalls) {
  const endpoint = routeMap[tool];

  if (!endpoint) {
    results.push({ tool, error: `Unknown tool "${tool}"` });
    continue;
  }

  if (endpoint === "local") {
    const localReply = await axios.post("http://localhost:11434/api/generate", {
      model: "mistral",
      prompt: llmRoutingPrompt,
      stream: false
    });
    results.push({ tool, result: localReply.data?.response || "LLM replied." });
  }

// else if (endpoint=== "coder") {
//   const escapedPrompt = prompt.replace(/"/g, '\\"');
//   const cmd = `python3 ./autocoder/main.py "${escapedPrompt}"`;

//   try {
//     await new Promise((resolve, reject) => {
//       exec(cmd, { timeout: 30000 }, (err, stdout, stderr) => {
//         if (err) reject(stderr || err.message);
//         else resolve(stdout.trim());
//       });
//     });

//     results.push({
//       tool,
//       result: "✅ Code generated successfully. You can find the file in the `autocoder/` folder."
//     });

//   } catch (err) {
//     results.push({ tool, error: `AutoCoder failed: ${err}` });
//   }
// }
  //  else if (tool==="email_handling") {
  //   try {
  //     const resp = await axios.post(endpoint, { prompt });
  //     results.push({ tool, result: resp.data });
  //   } catch (err) {
  //     results.push({ tool, error: err.message });
  //   }
  //     return res.json({
     
  //     tool_results: results,
      
  //   });

  // }

  else {
    try {
      const resp = await axios.post(endpoint, { prompt });
      results.push({ tool, result: resp.data });
    } catch (err) {
      results.push({ tool, error: err.message });
    }
  }
}

    // 📦 Generate final user-friendly answer
    const answerPrompt = `
User asked:
"${prompt}"

Tool output:
${JSON.stringify(results, null, 2)}

Now give a clear and helpful answer to the user.
`;

    const finalResponse = await axios.post("http://localhost:11434/api/generate", {
      model: "mistral",
      prompt: answerPrompt,
      stream: false
    });

    const finalAnswer = finalResponse.data?.response?.trim() || "✅ All tools executed.";

    // 🧠 Update memory (last 3)
    const updatedContext = [...contextHistory, { user: prompt, reply: finalAnswer }].slice(-3);
    fs.writeFileSync(CONTEXT_PATH, JSON.stringify(updatedContext, null, 2));

    return res.json({
      tool_calls: toolCalls,
      tool_results: results,
      answer: finalAnswer
    });

  } catch (err) {
    return res.status(500).json({ error: "Router failed: " + err.message });
  }
};
