import os
import subprocess

def kill_port(port):
    print(f"Cleaning port {port}...")
    try:
        output = subprocess.check_output(f"netstat -ano | findstr :{port}", shell=True).decode()
        pids = set()
        for line in output.strip().split('\n'):
            parts = line.split()
            if len(parts) > 4:
                pids.add(parts[-1])
        
        for pid in pids:
            print(f"Killing PID {pid}...")
            subprocess.run(f"taskkill /F /PID {pid}", shell=True)
        print("Done.")
    except Exception as e:
        print(f"Nothing found on port {port} or error: {e}")

if __name__ == "__main__":
    kill_port(5000)
