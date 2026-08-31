export type ProviderId =
	| "openai"
	| "google"
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
export type AppSecretKey = "local_api_token" | "license_key"

export type ApiKeyCredential = {
	type: "api_key"
	apiKey: string
}

export type CodexOAuthCredential = {
	type: "oauth"
	accessToken: string
	refreshToken: string
	expiresAt: number
	accountId?: string
}

export type ProviderCredential = ApiKeyCredential | CodexOAuthCredential
