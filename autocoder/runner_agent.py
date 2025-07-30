import subprocess

def run_code(file_path="generated_code.py"):
    try:
        result = subprocess.run(["python3", file_path], capture_output=True, text=True, timeout=10)
        return result.stdout.strip(), result.stderr.strip()
    except Exception as e:
        return "", f"Execution failed: {e}"
