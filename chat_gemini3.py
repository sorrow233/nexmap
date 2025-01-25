#!/usr/bin/env python3
"""
纯净的 Gemini 3 Flash 终端对话工具
严格按照 GMI Cloud 官方示例编写
"""

import requests
import json
import sys

# 配置（Native Gemini API 格式）
API_URL = "https://api.gmi-serving.com/v1/models/gemini-3-flash-preview:generateContent"
API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImJmNTIyNjI5LTNkNDgtNDA0Mi04ODdkLTY4Y2ViNTRiMTJiMiIsInNjb3BlIjoiaWVfbW9kZWwiLCJjbGllbnRJZCI6IjAwMDAwMDAwLTAwMDAtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMCJ9.Bm7Q34cdSXBwr0mrSLrfCq_-EbbqeeLtwoiUj5bQ3HI"

def chat(user_message, conversation_history=None):
    """
    使用 Gemini 原生 API 端点进行对话
    原生端点支持 google_search_retrieval 工具
    """
    if conversation_history is None:
        conversation_history = []
    
    # 构建原生 contents 结构
    contents = []
    for msg in conversation_history:
        role = "user" if msg["role"] == "user" else "model"
        contents.append({
            "role": role,
            "parts": [{"text": msg["content"]}]
        })
    
    # 添加当前用户输入
    contents.append({
        "role": "user",
        "parts": [{"text": user_message}]
    })
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}"
    }
    
    # 原生 payload 格式
    payload = {
        "contents": contents,
        "tools": [
            {
                "google_search": {}
            }
        ],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 2000
        }
    }
    
    try:
        response = requests.post(API_URL, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()
        
        # 原生响应解析
        # data["candidates"][0]["content"]["parts"][0]["text"]
        candidate = data["candidates"][0]
        assistant_message = candidate["content"]["parts"][0]["text"]
        
        # 记录历史
        next_history = conversation_history + [
            {"role": "user", "content": user_message},
            {"role": "assistant", "content": assistant_message}
        ]
        
        print(f"\n[调试信息 - Native API]")
        print(f"  模型: google/gemini-3-flash-preview")
        if "groundingMetadata" in candidate:
            print(f"  ✅ 已使用联网搜索渲染 (Grounding used)")
            
        return assistant_message, next_history
        
    except requests.exceptions.RequestException as e:
        print(f"❌ 请求失败: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"响应内容: {e.response.text}")
        sys.exit(1)

def main():
    """终端对话主循环"""
    print("=" * 60)
    print("Gemini 3 Flash 纯净对话终端")
    print("严格按照 GMI Cloud 官方示例实现")
    print("=" * 60)
    print("\n输入 'exit' 或 'quit' 退出")
    print("输入 'clear' 清空对话历史\n")
    
    conversation_history = []
    
    while True:
        try:
            user_input = input("\n你: ").strip()
            
            if not user_input:
                continue
                
            if user_input.lower() in ['exit', 'quit']:
                print("\n再见！👋")
                break
                
            if user_input.lower() == 'clear':
                conversation_history = []
                print("\n✅ 对话历史已清空")
                continue
            
            # 发送消息
            print("\n[正在思考...]")
            assistant_reply, conversation_history = chat(user_input, conversation_history)
            
            # 显示回复
            print(f"\nGemini 3: {assistant_reply}")
            
        except KeyboardInterrupt:
            print("\n\n再见！👋")
            break
        except Exception as e:
            print(f"\n❌ 错误: {e}")
            continue

if __name__ == "__main__":
    main()
