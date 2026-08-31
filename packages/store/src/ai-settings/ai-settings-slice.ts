import {
	AI_PROVIDER_DEFINITIONS,
	API_MODELS_MAP,
	type CustomProviderConfig,
	detectModelCapabilities,
	type FetchModelsOptions,
	fetchModelsFromProvider,
	type ModelCapability,
	type ProviderId,
} from "@mdit/ai"
import type { StateCreator } from "zustand"
import type { BrowserStorageLike } from "../browser-storage"
import type {
	ApiKeyProviderId,
	CodexOAuthCredential,
	ProviderCredential,
} from "./credentials"
import type { OllamaModels } from "./ollama-types"

export type ChatConfig = {
	provider: string
	model: string
	apiKey: string
	baseURL?: string
	customHeaders?: Record<string, string>
	protocol?: "openai" | "anthropic" | "google" | "ollama"
	accountId?: string
	vision?: boolean
	reasoning?: boolean
	toolCall?: boolean
	contextWindow?: number
	maxOutputTokens?: number
	temperature?: number
}

export type ApiModels = Record<string, string[]>
export type EnabledChatModels = { provider: string; model: string }[]

type PersistedModelConfig = {
	provider: string
	model: string
}

export type AISettingsSlice = {
	connectedProviders: ProviderId[]
	customProviders: CustomProviderConfig[]
	customBaseURLs: Record<string, string>
	modelCapabilities: Record<string, ModelCapability>
	chatConfig: ChatConfig | null
	apiModels: ApiModels
	ollamaCompletionModels: string[]
	ollamaEmbeddingModels: string[]
	enabledChatModels: EnabledChatModels
	chatHistoryRounds: number
	systemPrompt: string

	loadAISettings: () => Promise<void>
	connectProvider: (provider: ApiKeyProviderId, apiKey: string) => Promise<void>
	connectCodexOAuth: () => Promise<void>
	disconnectProvider: (provider: ProviderId) => Promise<void>
	refreshCodexOAuthForTarget: () => Promise<void>
	fetchOllamaModels: () => Promise<void>
	selectModel: (provider: string, model: string) => Promise<void>
	toggleModelEnabled: (
		provider: string,
		model: string,
		checked: boolean,
	) => void

	addCustomProvider: (provider: CustomProviderConfig) => void
	updateCustomProvider: (
		providerOrId: CustomProviderConfig | string,
		updates?: Partial<CustomProviderConfig>,
	) => void
	deleteCustomProvider: (id: string) => void
	setProviderBaseURL: (provider: string, baseURL?: string) => void
	updateModelCapability: (
		provider: string,
		model: string,
		capabilities: Partial<ModelCapability>,
	) => void
	fetchModelsForProvider: (providerId: string) => Promise<ModelCapability[]>
	setChatHistoryRounds: (rounds: number) => void
	setSystemPrompt: (prompt: string) => void
}

export type AISettingsSliceDependencies = {
	storage: BrowserStorageLike
	fetchOllamaModelCatalog: () => Promise<OllamaModels>
	listCredentialProviders: () => Promise<ProviderId[]>
	getCredential: (providerId: ProviderId) => Promise<ProviderCredential | null>
	setApiKeyCredential: (
		providerId: ApiKeyProviderId,
		apiKey: string,
	) => Promise<void>
	setCodexCredential: (credential: CodexOAuthCredential) => Promise<void>
	deleteCredential: (providerId: ProviderId) => Promise<void>
	startCodexBrowserOAuth: () => Promise<{
		accessToken: string
		refreshToken: string
		expiresAt: number
		accountId?: string
	}>
	refreshCodexAccessToken: (refreshToken: string) => Promise<{
		accessToken: string
		refreshToken: string
		expiresAt: number
		accountId?: string
	}>
	isCodexCredentialExpiringSoon: (
		credential: Pick<CodexOAuthCredential, "expiresAt">,
	) => boolean
}

const CHAT_CONFIG_KEY = "chat-config"
const ENABLED_CHAT_MODELS_KEY = "chat-enabled-models"
const CUSTOM_PROVIDERS_KEY = "chat-custom-providers"
const CUSTOM_BASE_URLS_KEY = "chat-custom-base-urls"
const MODEL_CAPABILITIES_KEY = "chat-model-capabilities"
const CHAT_HISTORY_ROUNDS_KEY = "chat-history-rounds"
const SYSTEM_PROMPT_KEY = "chat-system-prompt"

function isPersistedModelConfig(value: unknown): value is PersistedModelConfig {
	if (typeof value !== "object" || value === null) {
		return false
	}
	const candidate = value as { provider?: unknown; model?: unknown }
	return (
		typeof candidate.provider === "string" &&
		typeof candidate.model === "string"
	)
}

function toCodexCredential(
	value: ProviderCredential | null,
): CodexOAuthCredential | null {
	if (!value || value.type !== "oauth") {
		return null
	}
	return value
}

function toChatConfig(
	provider: string,
	model: string,
	credential: ProviderCredential | null,
	customProvider?: CustomProviderConfig,
	customBaseURL?: string,
	capability?: ModelCapability,
): ChatConfig | null {
	const modelCap = capability ?? detectModelCapabilities(model)
	if (customProvider) {
		return {
			provider: customProvider.id,
			model,
			apiKey: customProvider.apiKey ?? "",
			baseURL: customProvider.baseURL,
			protocol: customProvider.protocol,
			customHeaders: customProvider.customHeaders,
			vision: modelCap.vision,
			reasoning: modelCap.reasoning,
			toolCall: modelCap.toolCall,
			contextWindow: modelCap.contextWindow,
			maxOutputTokens: modelCap.maxOutputTokens,
			temperature: modelCap.temperature,
		}
	}
	if (provider === "ollama") {
		return {
			provider,
			model,
			apiKey: "",
			baseURL: customBaseURL,
			protocol: "ollama",
			vision: modelCap.vision,
			reasoning: modelCap.reasoning,
			toolCall: modelCap.toolCall,
			contextWindow: modelCap.contextWindow,
			maxOutputTokens: modelCap.maxOutputTokens,
			temperature: modelCap.temperature,
		}
	}
	if (!credential) {
		return null
	}
	if (credential.type === "api_key") {
		return {
			provider,
			model,
			apiKey: credential.apiKey,
			baseURL: customBaseURL,
			vision: modelCap.vision,
			reasoning: modelCap.reasoning,
			toolCall: modelCap.toolCall,
			contextWindow: modelCap.contextWindow,
			maxOutputTokens: modelCap.maxOutputTokens,
			temperature: modelCap.temperature,
		}
	}
	return {
		provider,
		model,
		apiKey: credential.accessToken,
		accountId: credential.accountId,
		baseURL: customBaseURL,
		vision: modelCap.vision,
		reasoning: modelCap.reasoning,
		toolCall: modelCap.toolCall,
		contextWindow: modelCap.contextWindow,
		maxOutputTokens: modelCap.maxOutputTokens,
		temperature: modelCap.temperature,
	}
}

function readPersistedModelConfig(
	storage: BrowserStorageLike,
	storageKey: string,
): PersistedModelConfig | null {
	const raw = storage.getItem(storageKey)
	if (!raw) {
		return null
	}
	try {
		const parsed = JSON.parse(raw) as unknown
		if (!isPersistedModelConfig(parsed)) {
			return null
		}
		return {
			provider: parsed.provider,
			model: parsed.model,
		}
	} catch {
		return null
	}
}

function writePersistedModelConfig(
	storage: BrowserStorageLike,
	storageKey: string,
	config: Pick<ChatConfig, "provider" | "model"> | null,
) {
	if (!config) {
		storage.removeItem(storageKey)
		return
	}
	storage.setItem(
		storageKey,
		JSON.stringify({ provider: config.provider, model: config.model }),
	)
}

function isKnownModel(
	provider: string,
	model: string,
	customProviders: CustomProviderConfig[] = [],
	ollamaCompletionModels: string[] = [],
	apiModels: ApiModels = API_MODELS_MAP,
): boolean {
	if (provider === "ollama") {
		return ollamaCompletionModels.length === 0
			? true
			: ollamaCompletionModels.includes(model)
	}
	const custom = customProviders.find((p) => p.id === provider)
	if (custom) {
		return (
			custom.models.length === 0 || custom.models.some((m) => m.id === model)
		)
	}
	return apiModels[provider]?.includes(model) ?? false
}

function readPersistedEnabledChatModels(
	storage: BrowserStorageLike,
	customProviders: CustomProviderConfig[] = [],
): EnabledChatModels {
	const raw = storage.getItem(ENABLED_CHAT_MODELS_KEY)
	if (!raw) {
		return []
	}

	try {
		const parsed = JSON.parse(raw) as unknown
		if (!Array.isArray(parsed)) {
			return []
		}

		const models = parsed
			.filter((value): value is { provider: unknown; model: unknown } => {
				if (typeof value !== "object" || value === null) {
					return false
				}
				const candidate = value as { provider?: unknown; model?: unknown }
				return (
					typeof candidate.provider === "string" &&
					typeof candidate.model === "string"
				)
			})
			.map(({ provider, model }) => ({
				provider: provider as string,
				model: model as string,
			}))
			.filter(({ provider, model }) =>
				isKnownModel(provider, model, customProviders),
			)

		return models
	} catch {
		return []
	}
}

function readPersistedCustomProviders(
	storage: BrowserStorageLike,
): CustomProviderConfig[] {
	const raw = storage.getItem(CUSTOM_PROVIDERS_KEY)
	if (!raw) {
		return []
	}
	try {
		const parsed = JSON.parse(raw)
		return Array.isArray(parsed) ? parsed : []
	} catch {
		return []
	}
}

function readPersistedCustomBaseURLs(
	storage: BrowserStorageLike,
): Record<string, string> {
	const raw = storage.getItem(CUSTOM_BASE_URLS_KEY)
	if (!raw) {
		return {}
	}
	try {
		return JSON.parse(raw) || {}
	} catch {
		return {}
	}
}

function readPersistedModelCapabilities(
	storage: BrowserStorageLike,
): Record<string, ModelCapability> {
	const raw = storage.getItem(MODEL_CAPABILITIES_KEY)
	if (!raw) {
		return {}
	}
	try {
		return JSON.parse(raw) || {}
	} catch {
		return {}
	}
}

function readPersistedHistoryRounds(storage: BrowserStorageLike): number {
	const raw = storage.getItem(CHAT_HISTORY_ROUNDS_KEY)
	if (!raw) return 10
	const num = Number(raw)
	return Number.isFinite(num) && num > 0 ? num : 10
}

function readPersistedSystemPrompt(storage: BrowserStorageLike): string {
	return storage.getItem(SYSTEM_PROMPT_KEY) ?? ""
}

function buildOllamaModelsStateUpdate(
	storage: BrowserStorageLike,
	prev: AISettingsSlice,
	modelCatalog: OllamaModels,
): Partial<AISettingsSlice> {
	const { completionModels, embeddingModels } = modelCatalog
	const nextEnabled = prev.enabledChatModels.filter((item) => {
		if (item.provider !== "ollama") {
			return true
		}
		return completionModels.includes(item.model)
	})

	const nextState: Partial<AISettingsSlice> = {
		ollamaCompletionModels: completionModels,
		ollamaEmbeddingModels: embeddingModels,
	}

	if (nextEnabled.length !== prev.enabledChatModels.length) {
		storage.setItem(ENABLED_CHAT_MODELS_KEY, JSON.stringify(nextEnabled))
		nextState.enabledChatModels = nextEnabled
	}

	if (
		prev.chatConfig?.provider === "ollama" &&
		!completionModels.includes(prev.chatConfig.model)
	) {
		storage.removeItem(CHAT_CONFIG_KEY)
		nextState.chatConfig = null
	}

	return nextState
}

export const prepareAISettingsSlice =
	({
		storage,
		fetchOllamaModelCatalog,
		listCredentialProviders,
		getCredential,
		setApiKeyCredential,
		setCodexCredential,
		deleteCredential,
		startCodexBrowserOAuth,
		refreshCodexAccessToken,
		isCodexCredentialExpiringSoon,
	}: AISettingsSliceDependencies): StateCreator<
		AISettingsSlice,
		[],
		[],
		AISettingsSlice
	> =>
	(set, get) => {
		const withConnectedProvider = (
			providers: ProviderId[],
			provider: ProviderId,
		): ProviderId[] => {
			return providers.includes(provider) ? providers : [...providers, provider]
		}

		const syncCredentialToConfigs = (
			prev: AISettingsSlice,
			provider: ProviderId,
			apiKey: string,
			accountId?: string,
		): Partial<AISettingsSlice> => {
			const nextState: Partial<AISettingsSlice> = {
				connectedProviders: withConnectedProvider(
					prev.connectedProviders,
					provider,
				),
			}

			if (prev.chatConfig?.provider === provider) {
				nextState.chatConfig = {
					...prev.chatConfig,
					apiKey,
					accountId,
				}
			}

			return nextState
		}

		const clearProviderState = (
			prev: AISettingsSlice,
			provider: ProviderId,
		): Partial<AISettingsSlice> => {
			const connectedProviders = prev.connectedProviders.filter(
				(item) => item !== provider,
			)
			const nextState: Partial<AISettingsSlice> = {
				connectedProviders,
			}

			if (prev.chatConfig?.provider === provider) {
				storage.removeItem(CHAT_CONFIG_KEY)
				nextState.chatConfig = null
			}

			const enabledChatModels = prev.enabledChatModels.filter(
				(item) => item.provider !== provider,
			)
			if (enabledChatModels.length !== prev.enabledChatModels.length) {
				storage.setItem(
					ENABLED_CHAT_MODELS_KEY,
					JSON.stringify(enabledChatModels),
				)
				nextState.enabledChatModels = enabledChatModels
			}

			return nextState
		}

		const selectConfigModel = async (
			provider: string,
			model: string,
		): Promise<void> => {
			const state = get()
			if (
				!isKnownModel(
					provider,
					model,
					state.customProviders,
					state.ollamaCompletionModels,
					state.apiModels,
				)
			) {
				return
			}

			const custom = state.customProviders.find((p) => p.id === provider)
			const capKey = `${provider}:${model}`
			const capability =
				state.modelCapabilities[capKey] ?? detectModelCapabilities(model)
			const customBaseURL = state.customBaseURLs[provider as ProviderId]

			if (custom) {
				const config = toChatConfig(
					provider,
					model,
					null,
					custom,
					undefined,
					capability,
				)
				if (!config) return
				writePersistedModelConfig(storage, CHAT_CONFIG_KEY, config)
				set({ chatConfig: config })
				return
			}

			if (provider === "ollama") {
				set((prev) => {
					if (
						prev.ollamaCompletionModels.length > 0 &&
						!prev.ollamaCompletionModels.includes(model)
					) {
						return {}
					}
					const config = toChatConfig(
						provider,
						model,
						null,
						undefined,
						prev.customBaseURLs.ollama,
						capability,
					)
					if (!config) return {}
					writePersistedModelConfig(storage, CHAT_CONFIG_KEY, config)
					return { chatConfig: config }
				})
				return
			}

			const credential = await getCredential(provider as ProviderId)
			const config = toChatConfig(
				provider,
				model,
				credential,
				undefined,
				customBaseURL,
				capability,
			)
			if (!config) {
				return
			}
			writePersistedModelConfig(storage, CHAT_CONFIG_KEY, config)
			set({ chatConfig: config })
		}

		return {
			connectedProviders: [],
			customProviders: readPersistedCustomProviders(storage),
			customBaseURLs: readPersistedCustomBaseURLs(storage),
			modelCapabilities: readPersistedModelCapabilities(storage),
			chatConfig: null,
			apiModels: API_MODELS_MAP,
			ollamaCompletionModels: [],
			ollamaEmbeddingModels: [],
			enabledChatModels: readPersistedEnabledChatModels(
				storage,
				readPersistedCustomProviders(storage),
			),
			chatHistoryRounds: readPersistedHistoryRounds(storage),
			systemPrompt: readPersistedSystemPrompt(storage),

			loadAISettings: async () => {
				const connectedProviders = await listCredentialProviders()
				const connectedProviderSet = new Set(connectedProviders)
				const customProviders = readPersistedCustomProviders(storage)
				const customBaseURLs = readPersistedCustomBaseURLs(storage)
				const modelCapabilities = readPersistedModelCapabilities(storage)
				const chatHistoryRounds = readPersistedHistoryRounds(storage)
				const systemPrompt = readPersistedSystemPrompt(storage)

				const resolvePersistedConfig = async (
					storageKey: string,
				): Promise<ChatConfig | null> => {
					const persisted = readPersistedModelConfig(storage, storageKey)
					if (!persisted) {
						storage.removeItem(storageKey)
						return null
					}

					const custom = customProviders.find(
						(p) => p.id === persisted.provider,
					)
					const capKey = `${persisted.provider}:${persisted.model}`
					const capability =
						modelCapabilities[capKey] ??
						detectModelCapabilities(persisted.model)

					if (custom) {
						return toChatConfig(
							persisted.provider,
							persisted.model,
							null,
							custom,
							undefined,
							capability,
						)
					}

					if (persisted.provider === "ollama") {
						return toChatConfig(
							"ollama",
							persisted.model,
							null,
							undefined,
							customBaseURLs.ollama,
							capability,
						)
					}

					if (!connectedProviderSet.has(persisted.provider as ProviderId)) {
						storage.removeItem(storageKey)
						return null
					}

					const credential = await getCredential(
						persisted.provider as ProviderId,
					)
					const resolved = toChatConfig(
						persisted.provider,
						persisted.model,
						credential,
						undefined,
						customBaseURLs[persisted.provider as ProviderId],
						capability,
					)
					if (!resolved) {
						storage.removeItem(storageKey)
						return null
					}

					return resolved
				}

				const chatConfig = await resolvePersistedConfig(CHAT_CONFIG_KEY)
				const persistedEnabled = readPersistedEnabledChatModels(
					storage,
					customProviders,
				)

				const filteredEnabled = persistedEnabled.filter(
					({ provider, model }) => {
						if (provider === "ollama") {
							return true
						}
						if (customProviders.some((p) => p.id === provider)) {
							return true
						}
						return (
							connectedProviderSet.has(provider as ProviderId) &&
							isKnownModel(provider, model, customProviders)
						)
					},
				)

				if (filteredEnabled.length !== persistedEnabled.length) {
					storage.setItem(
						ENABLED_CHAT_MODELS_KEY,
						JSON.stringify(filteredEnabled),
					)
				}

				set({
					connectedProviders,
					customProviders,
					customBaseURLs,
					modelCapabilities,
					chatConfig,
					enabledChatModels: filteredEnabled,
					chatHistoryRounds,
					systemPrompt,
				})
			},

			connectProvider: async (provider: ApiKeyProviderId, apiKey: string) => {
				const normalizedApiKey = apiKey.trim()
				if (!normalizedApiKey) {
					return
				}

				await setApiKeyCredential(provider, normalizedApiKey)

				set((prev) => {
					return syncCredentialToConfigs(prev, provider, normalizedApiKey)
				})
			},

			connectCodexOAuth: async () => {
				const result = await startCodexBrowserOAuth()
				const credential: CodexOAuthCredential = {
					type: "oauth",
					accessToken: result.accessToken,
					refreshToken: result.refreshToken,
					expiresAt: result.expiresAt,
					accountId: result.accountId,
				}
				await setCodexCredential(credential)

				set((prev) => {
					return syncCredentialToConfigs(
						prev,
						"codex_oauth",
						credential.accessToken,
						credential.accountId,
					)
				})
			},

			disconnectProvider: async (provider: ProviderId) => {
				await deleteCredential(provider)

				set((prev) => {
					return clearProviderState(prev, provider)
				})
			},

			refreshCodexOAuthForTarget: async () => {
				const currentState = get()
				const hasCodexTarget =
					currentState.chatConfig?.provider === "codex_oauth"
				if (!hasCodexTarget) {
					return
				}

				const clearCodexState = () => {
					set((prev) => {
						return clearProviderState(prev, "codex_oauth")
					})
				}

				const storedCredential = toCodexCredential(
					await getCredential("codex_oauth"),
				)
				if (!storedCredential) {
					clearCodexState()
					return
				}

				let nextCredential = storedCredential
				if (isCodexCredentialExpiringSoon(storedCredential)) {
					try {
						const refreshed = await refreshCodexAccessToken(
							storedCredential.refreshToken,
						)
						nextCredential = {
							type: "oauth",
							accessToken: refreshed.accessToken,
							refreshToken: refreshed.refreshToken,
							expiresAt: refreshed.expiresAt,
							accountId: refreshed.accountId ?? storedCredential.accountId,
						}
						await setCodexCredential(nextCredential)
					} catch (error) {
						console.error("Failed to refresh Codex OAuth credential:", error)
						await deleteCredential("codex_oauth")
						clearCodexState()
						return
					}
				}

				set((prev) => {
					return syncCredentialToConfigs(
						prev,
						"codex_oauth",
						nextCredential.accessToken,
						nextCredential.accountId,
					)
				})
			},

			fetchOllamaModels: async () => {
				try {
					const modelCatalog = await fetchOllamaModelCatalog()
					set((prev) =>
						buildOllamaModelsStateUpdate(storage, prev, modelCatalog),
					)
				} catch (error) {
					console.error("Failed to fetch Ollama models:", error)
				}
			},

			selectModel: async (provider: string, model: string) => {
				await selectConfigModel(provider, model)
			},

			toggleModelEnabled: (
				provider: string,
				model: string,
				checked: boolean,
			) => {
				set((prev) => {
					const exists = prev.enabledChatModels.some(
						(item) => item.provider === provider && item.model === model,
					)

					const enabledChatModels = checked
						? exists
							? prev.enabledChatModels
							: [...prev.enabledChatModels, { provider, model }]
						: prev.enabledChatModels.filter(
								(item) => item.provider !== provider || item.model !== model,
							)

					storage.setItem(
						ENABLED_CHAT_MODELS_KEY,
						JSON.stringify(enabledChatModels),
					)

					const nextState: Partial<AISettingsSlice> = {
						enabledChatModels,
					}

					if (
						!checked &&
						prev.chatConfig?.provider === provider &&
						prev.chatConfig?.model === model
					) {
						storage.removeItem(CHAT_CONFIG_KEY)
						nextState.chatConfig = null
					}

					return nextState
				})
			},

			addCustomProvider: (provider: CustomProviderConfig) => {
				set((prev) => {
					const nextCustom = [...prev.customProviders, provider]
					storage.setItem(CUSTOM_PROVIDERS_KEY, JSON.stringify(nextCustom))

					const nextCapabilities = { ...prev.modelCapabilities }
					for (const m of provider.models) {
						nextCapabilities[`${provider.id}:${m.id}`] = m
					}
					storage.setItem(
						MODEL_CAPABILITIES_KEY,
						JSON.stringify(nextCapabilities),
					)

					const nextApiModels = {
						...prev.apiModels,
						[provider.id]: provider.models.map((m) => m.id),
					}

					return {
						customProviders: nextCustom,
						modelCapabilities: nextCapabilities,
						apiModels: nextApiModels,
					}
				})
			},

			updateCustomProvider: (
				providerOrId: CustomProviderConfig | string,
				updates?: Partial<CustomProviderConfig>,
			) => {
				const id =
					typeof providerOrId === "string" ? providerOrId : providerOrId.id
				const actualUpdates =
					typeof providerOrId === "string" ? (updates ?? {}) : providerOrId

				set((prev) => {
					const nextCustom = prev.customProviders.map((p) =>
						p.id === id ? { ...p, ...actualUpdates } : p,
					)
					storage.setItem(CUSTOM_PROVIDERS_KEY, JSON.stringify(nextCustom))

					const updated = nextCustom.find((p) => p.id === id)
					const nextCapabilities = { ...prev.modelCapabilities }
					if (updated?.models) {
						for (const m of updated.models) {
							nextCapabilities[`${id}:${m.id}`] = m
						}
						storage.setItem(
							MODEL_CAPABILITIES_KEY,
							JSON.stringify(nextCapabilities),
						)
					}

					const nextApiModels = { ...prev.apiModels }
					if (updated?.models) {
						nextApiModels[id] = updated.models.map((m) => m.id)
					}

					return {
						customProviders: nextCustom,
						modelCapabilities: nextCapabilities,
						apiModels: nextApiModels,
					}
				})
			},

			deleteCustomProvider: (id: string) => {
				set((prev) => {
					const nextCustom = prev.customProviders.filter((p) => p.id !== id)
					storage.setItem(CUSTOM_PROVIDERS_KEY, JSON.stringify(nextCustom))

					const nextEnabled = prev.enabledChatModels.filter(
						(m) => m.provider !== id,
					)
					storage.setItem(ENABLED_CHAT_MODELS_KEY, JSON.stringify(nextEnabled))

					const nextState: Partial<AISettingsSlice> = {
						customProviders: nextCustom,
						enabledChatModels: nextEnabled,
					}

					if (prev.chatConfig?.provider === id) {
						storage.removeItem(CHAT_CONFIG_KEY)
						nextState.chatConfig = null
					}

					return nextState
				})
			},

			setProviderBaseURL: (provider: string, baseURL?: string) => {
				set((prev) => {
					const nextBaseURLs = { ...prev.customBaseURLs }
					if (baseURL?.trim()) {
						nextBaseURLs[provider] = baseURL.trim()
					} else {
						delete nextBaseURLs[provider]
					}
					storage.setItem(CUSTOM_BASE_URLS_KEY, JSON.stringify(nextBaseURLs))

					const nextState: Partial<AISettingsSlice> = {
						customBaseURLs: nextBaseURLs,
					}

					if (prev.chatConfig?.provider === provider) {
						nextState.chatConfig = {
							...prev.chatConfig,
							baseURL: baseURL?.trim() || undefined,
						}
					}

					return nextState
				})
			},

			updateModelCapability: (
				provider: string,
				model: string,
				capabilities: Partial<ModelCapability>,
			) => {
				set((prev) => {
					const key = `${provider}:${model}`
					const existing =
						prev.modelCapabilities[key] ?? detectModelCapabilities(model)
					const updated = { ...existing, ...capabilities }
					const nextCapabilities = {
						...prev.modelCapabilities,
						[key]: updated,
					}
					storage.setItem(
						MODEL_CAPABILITIES_KEY,
						JSON.stringify(nextCapabilities),
					)

					const nextState: Partial<AISettingsSlice> = {
						modelCapabilities: nextCapabilities,
					}

					if (
						prev.chatConfig?.provider === provider &&
						prev.chatConfig?.model === model
					) {
						nextState.chatConfig = {
							...prev.chatConfig,
							vision: updated.vision,
							reasoning: updated.reasoning,
							toolCall: updated.toolCall,
						}
					}

					return nextState
				})
			},

			fetchModelsForProvider: async (providerId: string) => {
				const state = get()
				let options: FetchModelsOptions | null = null

				const custom = state.customProviders.find((p) => p.id === providerId)
				if (custom) {
					options = {
						baseURL: custom.baseURL,
						apiKey: custom.apiKey,
						protocol: custom.protocol,
						customHeaders: custom.customHeaders,
					}
				} else if (providerId === "ollama") {
					options = {
						baseURL: state.customBaseURLs.ollama ?? "http://localhost:11434",
						protocol: "ollama",
					}
				} else {
					const presetDef = (AI_PROVIDER_DEFINITIONS as any)[providerId]
					if (presetDef) {
						const credential = await getCredential(providerId as ProviderId)
						const apiKey =
							credential?.type === "api_key" ? credential.apiKey : ""
						options = {
							baseURL:
								state.customBaseURLs[providerId as ProviderId] ??
								presetDef.defaultBaseURL ??
								"",
							apiKey,
							protocol: presetDef.protocol ?? "openai",
						}
					}
				}

				if (!options || !options.baseURL) {
					return []
				}

				try {
					const models = await fetchModelsFromProvider(options)
					if (models.length > 0) {
						set((prev) => {
							const nextCapabilities = { ...prev.modelCapabilities }
							for (const m of models) {
								const key = `${providerId}:${m.id}`
								nextCapabilities[key] = {
									...m,
									...nextCapabilities[key],
								}
							}
							storage.setItem(
								MODEL_CAPABILITIES_KEY,
								JSON.stringify(nextCapabilities),
							)

							let nextCustom = prev.customProviders
							if (custom) {
								nextCustom = prev.customProviders.map((p) =>
									p.id === providerId ? { ...p, models } : p,
								)
								storage.setItem(
									CUSTOM_PROVIDERS_KEY,
									JSON.stringify(nextCustom),
								)
							}

							const nextApiModels = {
								...prev.apiModels,
								[providerId]: models.map((m) => m.id),
							}

							return {
								modelCapabilities: nextCapabilities,
								customProviders: nextCustom,
								apiModels: nextApiModels,
							}
						})
					}
					return models
				} catch (error) {
					console.error(
						`Failed to fetch models for provider ${providerId}:`,
						error,
					)
					throw error
				}
			},

			setChatHistoryRounds: (rounds: number) => {
				storage.setItem(CHAT_HISTORY_ROUNDS_KEY, String(rounds))
				set({ chatHistoryRounds: rounds })
			},

			setSystemPrompt: (prompt: string) => {
				storage.setItem(SYSTEM_PROMPT_KEY, prompt)
				set({ systemPrompt: prompt })
			},
		}
	}
