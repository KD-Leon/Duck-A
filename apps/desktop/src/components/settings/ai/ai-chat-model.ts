import type { ChatConfig } from "@/store"

export type ChatModelOption = { provider: string; model: string }
export type ChatModelSelectOption = ChatModelOption & { value: string }

export function buildChatModelSelectValue(
	provider: string,
	model: string,
): string {
	return `${provider}|${model}`
}

export function buildChatModelSelectOptions(
	enabledModels: ChatModelOption[],
): ChatModelSelectOption[] {
	return enabledModels.map(({ provider, model }) => ({
		provider,
		model,
		value: buildChatModelSelectValue(provider, model),
	}))
}

export function parseChatModelSelectValue(
	value: string,
): ChatModelOption | null {
	const separatorIndex = value.indexOf("|")
	if (separatorIndex <= 0) {
		return null
	}

	const provider = value.slice(0, separatorIndex)
	const model = value.slice(separatorIndex + 1)
	if (!model || !provider) {
		return null
	}

	return {
		provider,
		model,
	}
}

export function resolveSelectedChatModelSelectValue(
	enabledModels: ChatModelOption[],
	chatConfig: ChatConfig | null,
): string | undefined {
	if (!chatConfig) {
		return undefined
	}

	const isEnabled = enabledModels.some(
		(item) =>
			item.provider === chatConfig.provider && item.model === chatConfig.model,
	)
	if (!isEnabled) {
		return undefined
	}

	return buildChatModelSelectValue(chatConfig.provider, chatConfig.model)
}

export async function handleChatModelSelectChange(
	value: string,
	onSelectModel: (provider: string, model: string) => Promise<void>,
): Promise<void> {
	const parsed = parseChatModelSelectValue(value)
	if (!parsed) {
		return
	}
	await onSelectModel(parsed.provider, parsed.model)
}
