import type {
	AIProviderProtocol,
	CustomProviderConfig,
	ModelCapability,
	PresetProviderId,
} from "./shared/chat-config"

export type {
	AIProviderProtocol,
	CustomProviderConfig,
	ModelCapability,
	PresetProviderId,
}

export type ProviderId =
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

export type ApiKeyProviderId = Exclude<ProviderId, "codex_oauth">

export type ChatProviderId = ProviderId | "ollama"

export type ProviderAuthKind = "api_key" | "oauth" | "host_url"

type BaseProviderDefinition = {
	label: string
	settingsUrl: string | null
	protocol?: AIProviderProtocol
	defaultBaseURL?: string
}

export type ApiKeyProviderDefinition = {
	[K in ApiKeyProviderId]: BaseProviderDefinition & {
		id: K
		authKind: "api_key"
	}
}[ApiKeyProviderId]

export type OAuthProviderDefinition = BaseProviderDefinition & {
	id: "codex_oauth"
	authKind: "oauth"
}

export type HostUrlProviderDefinition = BaseProviderDefinition & {
	id: "ollama"
	authKind: "host_url"
}

export type ProviderDefinition =
	| ApiKeyProviderDefinition
	| OAuthProviderDefinition
	| HostUrlProviderDefinition

type ProviderDefinitionMap = {
	[K in ChatProviderId]: Extract<ProviderDefinition, { id: K }>
}

export const AI_PROVIDER_DEFINITIONS: ProviderDefinitionMap = {
	google: {
		id: "google",
		label: "Google Gemini",
		authKind: "api_key",
		protocol: "google",
		settingsUrl: "https://aistudio.google.com",
	},
	openai: {
		id: "openai",
		label: "OpenAI",
		authKind: "api_key",
		protocol: "openai",
		settingsUrl: "https://platform.openai.com",
	},
	anthropic: {
		id: "anthropic",
		label: "Anthropic Claude",
		authKind: "api_key",
		protocol: "anthropic",
		settingsUrl: "https://console.anthropic.com",
	},
	deepseek: {
		id: "deepseek",
		label: "DeepSeek",
		authKind: "api_key",
		protocol: "openai",
		defaultBaseURL: "https://api.deepseek.com",
		settingsUrl: "https://platform.deepseek.com",
	},
	siliconflow: {
		id: "siliconflow",
		label: "SiliconFlow (硅基流动)",
		authKind: "api_key",
		protocol: "openai",
		defaultBaseURL: "https://api.siliconflow.cn/v1",
		settingsUrl: "https://cloud.siliconflow.cn",
	},
	moonshot: {
		id: "moonshot",
		label: "Moonshot (月之暗面 / Kimi)",
		authKind: "api_key",
		protocol: "openai",
		defaultBaseURL: "https://api.moonshot.cn/v1",
		settingsUrl: "https://platform.moonshot.cn",
	},
	zhipu: {
		id: "zhipu",
		label: "Zhipu AI (智谱 GLM)",
		authKind: "api_key",
		protocol: "openai",
		defaultBaseURL: "https://open.bigmodel.cn/api/paas/v4",
		settingsUrl: "https://open.bigmodel.cn",
	},
	dashscope: {
		id: "dashscope",
		label: "Alibaba DashScope (通义千问)",
		authKind: "api_key",
		protocol: "openai",
		defaultBaseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
		settingsUrl: "https://dashscope.console.aliyun.com",
	},
	baichuan: {
		id: "baichuan",
		label: "Baichuan (百川智能)",
		authKind: "api_key",
		protocol: "openai",
		defaultBaseURL: "https://api.baichuan-ai.com/v1",
		settingsUrl: "https://platform.baichuan-ai.com",
	},
	minimax: {
		id: "minimax",
		label: "MiniMax",
		authKind: "api_key",
		protocol: "openai",
		defaultBaseURL: "https://api.minimax.chat/v1",
		settingsUrl: "https://platform.minimaxi.com",
	},
	stepfun: {
		id: "stepfun",
		label: "StepFun (阶跃星辰)",
		authKind: "api_key",
		protocol: "openai",
		defaultBaseURL: "https://api.stepfun.com/v1",
		settingsUrl: "https://platform.stepfun.com",
	},
	together: {
		id: "together",
		label: "Together AI",
		authKind: "api_key",
		protocol: "openai",
		defaultBaseURL: "https://api.together.xyz/v1",
		settingsUrl: "https://api.together.xyz",
	},
	groq: {
		id: "groq",
		label: "Groq",
		authKind: "api_key",
		protocol: "openai",
		defaultBaseURL: "https://api.groq.com/openai/v1",
		settingsUrl: "https://console.groq.com",
	},
	openrouter: {
		id: "openrouter",
		label: "OpenRouter",
		authKind: "api_key",
		protocol: "openai",
		defaultBaseURL: "https://openrouter.ai/api/v1",
		settingsUrl: "https://openrouter.ai",
	},
	mistral: {
		id: "mistral",
		label: "Mistral AI",
		authKind: "api_key",
		protocol: "openai",
		defaultBaseURL: "https://api.mistral.ai/v1",
		settingsUrl: "https://console.mistral.ai",
	},
	codex_oauth: {
		id: "codex_oauth",
		label: "ChatGPT Codex",
		authKind: "oauth",
		settingsUrl: "https://chatgpt.com",
	},
	ollama: {
		id: "ollama",
		label: "Ollama (本地模型)",
		authKind: "host_url",
		protocol: "ollama",
		defaultBaseURL: "http://localhost:11434",
		settingsUrl: "https://ollama.com",
	},
}

export const API_MODELS_MAP: Record<ProviderId, string[]> = {
	google: [
		"gemini-2.5-flash",
		"gemini-2.5-pro",
		"gemini-2.0-flash",
		"gemini-1.5-flash",
		"gemini-1.5-pro",
	],
	openai: [
		"gpt-5.4",
		"gpt-4o",
		"gpt-4o-mini",
		"gpt-4-turbo",
		"o1",
		"o1-mini",
		"o3-mini",
	],
	anthropic: [
		"claude-3-7-sonnet-20250219",
		"claude-3-5-sonnet-20241022",
		"claude-3-5-haiku-20241022",
		"claude-3-opus-20240229",
		"claude-sonnet-4-5",
		"claude-haiku-4-5",
	],
	deepseek: ["deepseek-chat", "deepseek-reasoner"],
	siliconflow: [
		"deepseek-ai/DeepSeek-V3",
		"deepseek-ai/DeepSeek-R1",
		"Qwen/Qwen2.5-72B-Instruct",
		"Qwen/Qwen2.5-VL-72B-Instruct",
	],
	moonshot: [
		"moonshot-v1-auto",
		"moonshot-v1-8k",
		"moonshot-v1-32k",
		"moonshot-v1-128k",
		"kimi-latest",
	],
	zhipu: [
		"glm-4-plus",
		"glm-4-air",
		"glm-4-flash",
		"glm-4v-plus",
		"glm-zero-preview",
	],
	dashscope: [
		"qwen-max",
		"qwen-plus",
		"qwen-turbo",
		"qwen-vl-max",
		"qwen-omni-turbo",
		"qvq-72b-preview",
	],
	baichuan: ["Baichuan4-Air", "Baichuan4-Turbo", "Baichuan4"],
	minimax: ["MiniMax-Text-01", "abab6.5s-chat", "abab6.5g-chat"],
	stepfun: ["step-2-16k", "step-1-8k", "step-1v-8k", "step-1-flash"],
	together: [
		"meta-llama/Llama-3.3-70B-Instruct-Turbo",
		"deepseek-ai/DeepSeek-R1",
		"Qwen/Qwen2.5-72B-Instruct-Turbo",
	],
	groq: [
		"llama-3.3-70b-versatile",
		"llama-3.1-8b-instant",
		"mixtral-8x7b-32768",
		"deepseek-r1-distill-llama-70b",
	],
	openrouter: [
		"anthropic/claude-3.5-sonnet",
		"deepseek/deepseek-r1",
		"deepseek/deepseek-chat",
		"google/gemini-2.0-flash-001",
		"openai/gpt-4o",
	],
	mistral: [
		"mistral-large-latest",
		"mistral-small-latest",
		"codestral-latest",
		"pixtral-large-latest",
	],
	codex_oauth: ["gpt-5.4", "gpt-5.2-codex", "gpt-4o", "gpt-4o-mini", "o1-mini"],
}

export const CREDENTIAL_PROVIDER_IDS = Object.keys(
	API_MODELS_MAP,
) as Array<ProviderId>

export function detectModelCapabilities(
	modelId: string,
	name?: string,
): ModelCapability {
	const lower = modelId.toLowerCase()

	// Vision / Image recognition detection
	const isVision =
		lower.includes("4o") ||
		lower.includes("4-turbo") ||
		lower.includes("vision") ||
		lower.includes("-vl") ||
		lower.includes("gemini") ||
		lower.includes("claude-3") ||
		lower.includes("claude-4") ||
		lower.includes("claude-3-5") ||
		lower.includes("claude-3-7") ||
		lower.includes("llava") ||
		lower.includes("pixtral") ||
		lower.includes("qwen-vl") ||
		lower.includes("qwen2.5-vl") ||
		lower.includes("glm-4v") ||
		lower.includes("kimi-latest") ||
		lower.includes("1v-") ||
		lower.includes("qvq")

	// Reasoning / Thinking detection
	const isReasoning =
		lower.includes("r1") ||
		lower.includes("reasoner") ||
		lower.includes("o1") ||
		lower.includes("o3") ||
		lower.includes("qwq") ||
		lower.includes("thinking") ||
		lower.includes("zero")

	// Tool call support: true for modern LLMs except embeddings
	const isEmbedding =
		lower.includes("embed") ||
		lower.includes("bge") ||
		lower.includes("text-embedding")
	const isToolCall = !isEmbedding && !lower.includes("instruct-base")

	// Default context window tokens
	let contextWindow = 32768
	if (lower.includes("gemini-1.5") || lower.includes("gemini-2")) {
		contextWindow = 1048576 // 1M
	} else if (lower.includes("claude-3") || lower.includes("claude-4")) {
		contextWindow = 200000 // 200k
	} else if (
		lower.includes("4o") ||
		lower.includes("128k") ||
		lower.includes("glm-4") ||
		lower.includes("qwen2.5") ||
		lower.includes("o1") ||
		lower.includes("o3")
	) {
		contextWindow = 128000 // 128k
	} else if (lower.includes("64k") || lower.includes("deepseek")) {
		contextWindow = 64000
	}

	// Default max output tokens
	let maxOutputTokens = 4096
	if (isReasoning || lower.includes("claude-3-7")) {
		maxOutputTokens = 16384
	} else if (lower.includes("4o") || lower.includes("gemini")) {
		maxOutputTokens = 8192
	}

	return {
		id: modelId,
		name: name ?? modelId,
		vision: isVision,
		reasoning: isReasoning,
		toolCall: isToolCall,
		contextWindow,
		maxOutputTokens,
		temperature: 0.7,
	}
}
