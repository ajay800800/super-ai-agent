import json
from pathlib import Path
from coder_agent import generate_code
from runner_agent import run_code

MAX_TRIES = 5
MEMORY_FILE = "memory.json"

def load_memory():
    if Path(MEMORY_FILE).exists():
        with open(MEMORY_FILE) as f:
            return json.load(f)
    return {"history": []}

def save_memory(mem):
    with open(MEMORY_FILE, "w") as f:
        json.dump(mem, f, indent=2)

def save_code(code, attempt):
    filename = f"generated_code_{attempt}.py"
    with open(filename, "w") as f:
        f.write(code)
    print(f"💾 Code written to {filename}")
    return filename

def main():
    task = input("🧠 What do you want the agent to code? ")
    memory = load_memory()
    error = None

    for attempt in range(1, MAX_TRIES + 1):
        print(f"\n🔁 Attempt {attempt}")

        code, full_output = generate_code(task, error)
        code_file = save_code(code, attempt)

        stdout, stderr = run_code(code_file)

        memory['history'].append({
            "attempt": attempt,
            "code": code,
            "output": stdout,
            "error": stderr,
            "filename": code_file
        })
        save_memory(memory)

        if stderr:
            print("❌ Error:\n", stderr)
            error = stderr
        else:
            print("✅ Success:\n", stdout)
            print(code)
            break
    else:
        print("\n⚠️ All attempts failed. See memory.json for logs.")

if __name__ == "__main__":
    main()
