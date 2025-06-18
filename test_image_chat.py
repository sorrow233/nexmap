from openai import OpenAI
import json

client = OpenAI(
    base_url="http://127.0.0.1:8045/v1",
    api_key="sk-26293a81356d45c499284bdacbfa00b3"
)

print("Attempting image generation via chat completions...")
try:
    response = client.chat.completions.create(
        model="gemini-3-pro-image",
        extra_body={ "size": "1024x1024" },
        messages=[{
            "role": "user",
            "content": "Draw a futuristic city"
        }]
    )
    
    print("Response received:")
    print(response.choices[0].message.content)
except Exception as e:
    print(f"Error: {e}")
