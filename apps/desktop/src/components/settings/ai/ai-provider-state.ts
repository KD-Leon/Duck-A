import {
	AI_PROVIDER_DEFINITIONS,
	CREDENTIAL_PROVIDER_IDS,
	type CustomProviderConfig,
	type ProviderId,
} from "@mdit/ai"

type CredentialProviderId = (typeof CREDENTIAL_PROVIDER_IDS)[number]

export type ApiModelsByProvider = Partial<Record<string, string[]>>

export type ProviderModels = {
	provider: string
	models: string[]
}

export type CredentialProviderDefinition =
	(typeof AI_PROVIDER_DEFINITIONS)[CredentialProviderId]

export function buildProviderModels(
	apiModels: ApiModelsByProvider,
	ollamaCompletionModels: string[],
	customProviders: CustomProviderConfig[] = [],
): ProviderModels[] {
	const presetList: ProviderModels[] = [
		...CREDENTIAL_PROVIDER_IDS.map((provider) => ({
			provider,
			models: apiModels[provider] ?? [],
		})),
		{ provider: "ollama", models: ollamaCompletionModels },
	]

	const customList: ProviderModels[] = customProviders.map((cp) => ({
		provider: cp.id,
		models: cp.models.map((m) => m.id),
	}))

	return [...presetList, ...customList]
}

export function hasConnectedProviderModels(
	connectedProviders: ProviderId[],
	ollamaCompletionModels: string[],
	customProviders: CustomProviderConfig[] = [],
): boolean {
	return (
		connectedProviders.length > 0 ||
		ollamaCompletionModels.length > 0 ||
		customProviders.length > 0
	)
}

export function getCredentialProviderDefinitions(): CredentialProviderDefinition[] {
	return CREDENTIAL_PROVIDER_IDS.map(
		(providerId) => AI_PROVIDER_DEFINITIONS[providerId],
	)
}

export function getAllPresetProviderDefinitions(): (
	| CredentialProviderDefinition
	| typeof AI_PROVIDER_DEFINITIONS.ollama
)[] {
	return [...getCredentialProviderDefinitions(), AI_PROVIDER_DEFINITIONS.ollama]
}
