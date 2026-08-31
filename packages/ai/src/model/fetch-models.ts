import {
	detectModelCapabilities,
	type ModelCapability,
} from "../provider-registry"
import type { AIProviderProtocol } from "../shared/chat-config"

export interface FetchModelsOptions {
	baseURL: string
	apiKey?: string
	protocol?: AIProviderProtocol
	customHeaders?: Record<string, string>
	fetch?: typeof fetch
}

export async function fetchModelsFromProvider(
	options: FetchModelsOptions,
): Promise<ModelCapability[]> {
	const fetchImpl = options.fetch ?? globalThis.fetch
	if (!fetchImpl) {
		throw new Error("No fetch implementation available.")
	}

	const normalizedBaseURL = options.baseURL.replace(/\/+$/, "")
	const protocol = options.protocol ?? "openai"

	if (protocol === "ollama") {
		const targetUrl = `${normalizedBaseURL}/api/tags`
		const headers: Record<string, string> = {
			...options.customHeaders,
		}
		if (options.apiKey) {
			headers.Authorization = `Bearer ${options.apiKey}`
		}

		const response = await fetchImpl(targetUrl, {
			method: "GET",
			headers,
		})

		if (!response.ok) {
			throw new Error(
				`Failed to fetch Ollama models (${response.status} ${response.statusText})`,
			)
		}

		const data = (await response.json()) as {
			models?: Array<{ name: string; model?: string }>
		}

		const models = data.models ?? []
		return models.map((m) => detectModelCapabilities(m.name, m.name))
	}

	// OpenAI compatible / Anthropic / Custom endpoint models fetch
	const urlsToTry: string[] = []
	if (normalizedBaseURL.endsWith("/v1")) {
		urlsToTry.push(`${normalizedBaseURL}/models`)
	} else {
		urlsToTry.push(`${normalizedBaseURL}/v1/models`)
		urlsToTry.push(`${normalizedBaseURL}/models`)
	}

	const headers: Record<string, string> = {
		Accept: "application/json",
		...options.customHeaders,
	}
	if (options.apiKey) {
		headers.Authorization = `Bearer ${options.apiKey}`
		headers["x-api-key"] = options.apiKey
	}

	let lastError: Error | null = null
	for (const url of urlsToTry) {
		try {
			const response = await fetchImpl(url, {
				method: "GET",
				headers,
			})

			if (!response.ok) {
				lastError = new Error(
					`Failed to fetch models from ${url} (${response.status} ${response.statusText})`,
				)
				continue
			}

			const json = (await response.json()) as {
				data?: Array<{ id: string; name?: string }>
				models?: Array<{ id?: string; name?: string }>
			}

			const rawList = Array.isArray(json)
				? json
				: (json.data ?? json.models ?? [])

			const capabilities: ModelCapability[] = rawList
				.map((item: any) => {
					const id = typeof item === "string" ? item : (item?.id ?? item?.name)
					if (!id) return null
					const name = typeof item === "object" ? (item?.name ?? id) : id
					return detectModelCapabilities(id, name)
				})
				.filter((item): item is ModelCapability => Boolean(item))

			if (capabilities.length > 0) {
				return capabilities
			}
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error))
		}
	}

	if (lastError) {
		throw lastError
	}

	return []
}
