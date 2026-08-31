import { createAnthropic } from "@ai-sdk/anthropic"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai"
import type { LanguageModel } from "ai"
import { createOllama, ollama } from "ollama-ai-provider-v2"
import { AI_PROVIDER_DEFINITIONS } from "../provider-registry"
import type { AIChatConfig, AICodexModelOptions } from "../shared/chat-config"
import { buildCodexHeaders } from "./codex-headers"

export function createModelFromChatConfig(
	config: AIChatConfig,
	options?: { codex?: AICodexModelOptions },
): LanguageModel {
	if (config.provider === "codex_oauth") {
		const codex = options?.codex
		if (!codex) {
			throw new Error("Codex options are required for codex_oauth provider.")
		}

		return createOpenAI({
			apiKey: config.apiKey,
			baseURL: codex.baseURL,
			headers: buildCodexHeaders({ chatConfig: config, codex }),
			fetch: codex.fetch,
		})(config.model)
	}

	const presetDef = (AI_PROVIDER_DEFINITIONS as Record<string, any>)[
		config.provider
	]
	const protocol = config.protocol ?? presetDef?.protocol ?? "openai"
	const baseURL = config.baseURL ?? presetDef?.defaultBaseURL
	const headers = config.customHeaders

	switch (protocol) {
		case "anthropic": {
			const anthropic = createAnthropic({
				apiKey: config.apiKey,
				...(baseURL ? { baseURL } : {}),
				...(headers ? { headers } : {}),
			})
			return anthropic(config.model)
		}
		case "google": {
			const google = createGoogleGenerativeAI({
				apiKey: config.apiKey,
				...(baseURL ? { baseURL } : {}),
				...(headers ? { headers } : {}),
			})
			return google(config.model)
		}
		case "ollama": {
			if (baseURL || headers) {
				const customOllama = createOllama({
					...(baseURL ? { baseURL } : {}),
					...(headers ? { headers } : {}),
				})
				return customOllama(config.model)
			}
			return ollama(config.model)
		}
		default: {
			const openai = createOpenAI({
				apiKey: config.apiKey,
				...(baseURL ? { baseURL } : {}),
				...(headers ? { headers } : {}),
			})
			return openai(config.model)
		}
	}
}
