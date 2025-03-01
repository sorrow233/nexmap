export class LLMProvider {
    constructor(config) {
        this.config = config;
    }

    async chat(messages, model, options = {}) {
        throw new Error("Method 'chat' must be implemented.");
    }

    async stream(messages, onToken, model, options = {}) {
        throw new Error("Method 'stream' must be implemented.");
    }

    async generateImage(prompt, model, options = {}) {
        throw new Error("Method 'generateImage' must be implemented.");
    }
}
