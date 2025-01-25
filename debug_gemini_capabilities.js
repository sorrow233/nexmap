
import { chatCompletion, streamChatCompletion, setApiKey, setBaseUrl, setModel } from './src/services/llm.js';

// MOCK: In a real "local run" requested by user, we'd need to access their actual keys.
// Since I am an AI agent running in a cloud environment, I cannot access the user's browser localStorage directly to get the key.
// However, the user said "You should have my Key and APi vendor".
// This implies I should use the values currently in the codebase or environment if available.
// If I can't read them, I will ask user layout but for now I will try to read from a 'config' or assume they are set.

// Wait, the user said "Run a debug script locally". 
// I will create a script that they can run, OR I will run it if I have the secrets.
// But I don't have their secrets in my env vars (likely).
// I will simulate the check by creating a script that *would* run if executed in their environment context.

// Actually, I can use `node` to run this script if I can source the keys. 
// But keys are in localStorage on the browser.
// I will create a Browser-compatible test file instead? No, user said "run a local debug script".
// I will write a Node.js script.

async function runDebug() {
    console.log("🔍 Starting Gemini 3 Flash Capability Test...");

    // CONFIGURATION (Placeholder - User would need to fill this or I read from env if set)
    // The user implied I have them. I will try to read from process.env widely used?
    // Or I will output a script that "Tests" it.

    // Let's assume the user runs this with their key.
    // console.log("Please set API_KEY and BASE_URL env vars or hardcode them for this test.");

    const API_KEY = process.env.API_KEY || "YOUR_API_KEY_HERE";
    const BASE_URL = process.env.BASE_URL || "https://api.gmi-serving.com/v1";
    const MODEL = "google/gemini-3-flash-preview";

    console.log(`Target: ${BASE_URL} | Model: ${MODEL}`);
    if (API_KEY === "YOUR_API_KEY_HERE") {
        console.error("❌ API_KEY not provided. Please edit script or set env var.");
        process.exit(1);
    }

    // 1. Identity Test
    console.log("\n🧪 Test 1: Identity & System Prompt Injection");
    try {
        // We manually construct the payload as App.jsx does
        const messages = [
            { role: 'system', content: "You are Gemini 3 Flash, the latest AI model from Google. You contain a built-in thinking process that allows you to reason deeply. Always identify yourself as Gemini 3 Flash. Use <thinking> tags for your internal thought process." },
            { role: 'user', content: "Who are you? What version of Gemini is this?" }
        ];

        console.log("Sending request...");
        // Polyfill fetch for Node.js if needed (Node 18+ has it native)

        const response = await fetch(`${BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: MODEL,
                messages: messages,
                thinking_level: "high", // The secret sauce
                temperature: 0.7
            })
        });

        const data = await response.json();
        console.log("Response:", JSON.stringify(data, null, 2));

        const content = data.choices[0].message.content;
        if (content.toLowerCase().includes("gemini 3") || content.toLowerCase().includes("flash")) {
            console.log("✅ Identity Verified: Model claims to be Gemini 3 Flash.");
        } else {
            console.warn("⚠️ Identity Warning: Model did not explicitly state 'Gemini 3 Flash'.");
        }

        if (content.includes("<thinking>")) {
            console.log("✅ Thinking Tags Verified: Model is using <thinking> process.");
        } else {
            console.warn("⚠️ Thinking Warning: No <thinking> tags found in short response (might be normal for simple queries).");
        }

    } catch (e) {
        console.error("❌ Test 1 Failed:", e.message);
    }

    // 2. Logic Test (Hard)
    console.log("\n🧪 Test 2: Complex Logic (Strawberry Problem)");
    try {
        const messages = [
            { role: 'system', content: "You are Gemini 3 Flash. Use <thinking> tags." },
            { role: 'user', content: "How many 'r's are in the word 'strawberry'?" }
        ];

        const response = await fetch(`${BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
            body: JSON.stringify({ model: MODEL, messages, thinking_level: "high" })
        });

        const data = await response.json();
        const content = data.choices[0].message.content;
        console.log("\nResponse:", content);

        if (content.includes("3") || content.includes("three")) {
            console.log("✅ Logic Verified: Correct count (3).");
        } // Simple test

    } catch (e) {
        console.error("❌ Test 2 Failed:", e.message);
    }
}

runDebug();
