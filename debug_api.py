
import aiohttp
import asyncio
import json

API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjhiZjI1ZDc0LTQ4NjctNDZlZC04ZGRlLTg0OTIxNGU3NTJhYyIsInNjb3BlIjoiaWVfbW9kZWwiLCJjbGllbnRJZCI6IjAwMDAwMDAwLTAwMDAtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMCJ9.lfIcQ8NILupuATAbrlblQ1OBkDezf7L1E4Rpv6Qa5m0"
BASE_URL = "https://api.gmi-serving.com/v1"

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
