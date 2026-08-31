export type PresetProviderId =
	| "google"
	| "openai"
	| "anthropic"
	| "deepseek"
	| "siliconflow"
	| "moonshot"
	| "zhipu"
	| "dashscope"
	| "baichuan"
	| "minimax"
	| "stepfun"
	| "together"
	| "groq"
	| "openrouter"
	| "mistral"
	| "codex_oauth"
	| "ollama"

export type AIProviderProtocol = "openai" | "anthropic" | "google" | "ollama"

export type AIProvider = PresetProviderId | string

export type ModelCapability = {
	id: string
	name?: string
	vision?: boolean // 是否支持图片识别 (Vision)
	toolCall?: boolean // 是否支持工具调用 (Function Call / Tools)
	reasoning?: boolean // 是否支持深度思考 (Reasoning / Thinking)
	contextWindow?: number // 输入上下文长度 (Context Window Tokens, e.g. 128000)
	maxOutputTokens?: number // 最大输出 Tokens (e.g. 4096)
	temperature?: number // 温度 (0.0 - 2.0)
}

export type CustomProviderConfig = {
	id: string
	name: string
	protocol: AIProviderProtocol
	baseURL: string
	apiKey?: string
	customHeaders?: Record<string, string>
	models: ModelCapability[]
	enabled: boolean
}

export type AIChatConfig = {
	provider: AIProvider
	model: string
	apiKey: string
	baseURL?: string
	customHeaders?: Record<string, string>
	protocol?: AIProviderProtocol
	accountId?: string
	vision?: boolean
	reasoning?: boolean
	toolCall?: boolean
	contextWindow?: number
	maxOutputTokens?: number
	temperature?: number
}

export type AICodexModelOptions = {
	baseURL: string
	fetch: typeof fetch
	createSessionId: () => string
	sessionId?: string
	headers?: Record<string, string>
}
