import requests
import re

OLLAMA_API = "http://localhost:11434/api/chat"
MODEL = "mistral"

def extract_code(response_text):
    """
    Extracts code between <code> and </code> using regex.
    If not found, fallback to entire text.
    """
    match = re.search(r"<code>(.*?)</code>", response_text, re.DOTALL)
    if match:
        return match.group(1).strip()
    else:
        print("⚠️ No <code>...</code> block found in LLM response.")
        print("🧠 Raw response:\n", response_text)
        return response_text.strip()

def generate_code(task, error=None):
    if error:
        prompt = f"""
You are an expert Python coding agent.

Task: {task}

The previous code attempt failed. Fix it using the error below.

Error:
{error}

Respond STRICTLY with the corrected Python script wrapped inside <code> and </code>. DO NOT include any explanations, markdown, or extra text.

Format:
<code>
# your python code here
</code>
"""
    else:
        prompt = f"""
You are an expert Python coding agent.

Write a complete and runnable Python script that does the following:

Task: {task}

⚠️ Respond STRICTLY in the following format:
<code>
# your python code here
</code>

❌ DO NOT write explanations, markdown, or anything outside the <code>...</code> block.
"""

    res = requests.post(OLLAMA_API, json={
        "model": MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "stream": False
    })

    full_response = res.json()['message']['content']
    extracted_code = extract_code(full_response)

    return extracted_code, full_response
