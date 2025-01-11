import aiohttp
import asyncio
import json
import os

# Try to load from git-ignored local config, fallback to environment variable
try:
    import debug_config
    API_KEY = getattr(debug_config, 'API_KEY', os.environ.get("LLM_API_KEY", ""))
    BASE_URL = getattr(debug_config, 'BASE_URL', os.environ.get("LLM_BASE_URL", "https://api.gmi-serving.com/v1"))
except ImportError:
    API_KEY = os.environ.get("LLM_API_KEY", "YOUR_KEY_HERE")
    BASE_URL = os.environ.get("LLM_BASE_URL", "https://api.gmi-serving.com/v1")

async def test_stream():
    url = f"{BASE_URL.rstrip('/')}/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}"
    }
    data = {
        "model": "google/gemini-3-flash-preview",
        "messages": [{"role": "user", "content": "你好"}],
        "temperature": 0.7,
        "stream": True,
        "thinking_level": "minimal"
    }

    print(f"Connecting to {url}...")
    async with aiohttp.ClientSession() as session:
        async with session.post(url, headers=headers, json=data) as response:
            if response.status != 200:
                print(f"Error: {response.status}")
                print(await response.text())
                return

            print("Streaming response:")
            async for line in response.content:
                line = line.decode('utf-8').strip()
                if line.startswith('data: '):
                    if line == 'data: [DONE]':
                        break
                    try:
                        json_str = line[6:]
                        chunk = json.loads(json_str)
                        content = chunk['choices'][0]['delta'].get('content', '')
                        print(f"RAW CHUNK: {repr(content)}")
                    except Exception as e:
                        print(f"Error parsing line: {line} - {e}")

if __name__ == "__main__":
    asyncio.run(test_stream())
