"use client"

import type {
	AIProviderProtocol,
	CustomProviderConfig,
	ModelCapability,
} from "@mdit/ai"
import { fetchModelsFromProvider } from "@mdit/ai"
import { Button } from "@mdit/ui/components/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@mdit/ui/components/dialog"
import { Input } from "@mdit/ui/components/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@mdit/ui/components/select"
import { Loader2Icon, RefreshCcwIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { useTranslation } from "@/i18n"

interface CustomProviderDialogProps {
	isOpen: boolean
	onClose: () => void
	onSave: (provider: CustomProviderConfig) => void
	initialProvider?: CustomProviderConfig | null
}

export function CustomProviderDialog({
	isOpen,
	onClose,
	onSave,
	initialProvider,
}: CustomProviderDialogProps) {
	const { t } = useTranslation()
	const ai = t.settings.ai

	const [name, setName] = useState("")
	const [protocol, setProtocol] = useState<AIProviderProtocol>("openai")
	const [baseURL, setBaseURL] = useState("")
	const [apiKey, setApiKey] = useState("")
	const [customHeaders, setCustomHeaders] = useState("")
	const [isFetchingModels, setIsFetchingModels] = useState(false)
	const [fetchedModels, setFetchedModels] = useState<ModelCapability[]>([])

	useEffect(() => {
		if (isOpen) {
			if (initialProvider) {
				setName(initialProvider.name)
				setProtocol(initialProvider.protocol)
				setBaseURL(initialProvider.baseURL)
				setApiKey(initialProvider.apiKey ?? "")
				setCustomHeaders(
					initialProvider.customHeaders
						? JSON.stringify(initialProvider.customHeaders, null, 2)
						: "",
				)
				setFetchedModels(initialProvider.models ?? [])
			} else {
				setName("")
				setProtocol("openai")
				setBaseURL("")
				setApiKey("")
				setCustomHeaders("")
				setFetchedModels([])
			}
		}
	}, [isOpen, initialProvider])

	const parseHeaders = (): Record<string, string> | undefined => {
		if (!customHeaders.trim()) return undefined
		try {
			const parsed = JSON.parse(customHeaders)
			if (typeof parsed === "object" && parsed !== null) {
				return parsed
			}
		} catch {
			toast.error(t.common.cancel)
		}
		return undefined
	}

	const handleFetchModels = async () => {
		if (!baseURL.trim()) {
			toast.error("Please enter a Base URL.")
			return
		}

		setIsFetchingModels(true)
		try {
			const headers = parseHeaders()
			const models = await fetchModelsFromProvider({
				baseURL: baseURL.trim(),
				apiKey: apiKey.trim() || undefined,
				protocol,
				customHeaders: headers,
			})

			setFetchedModels(models)
			toast.success(`${ai.modelsFetched} (${models.length})`)
		} catch (error) {
			console.error("Failed to fetch models:", error)
			toast.error(ai.fetchFailed)
		} finally {
			setIsFetchingModels(false)
		}
	}

	const handleSave = () => {
		const trimmedName = name.trim()
		const trimmedBaseURL = baseURL.trim()
		if (!trimmedName || !trimmedBaseURL) {
			toast.error("Name and Base URL are required.")
			return
		}

		let headers: Record<string, string> | undefined
		if (customHeaders.trim()) {
			try {
				headers = JSON.parse(customHeaders)
			} catch {
				toast.error("Invalid JSON format for custom headers.")
				return
			}
		}

		const providerConfig: CustomProviderConfig = {
			id: initialProvider
				? initialProvider.id
				: `custom_${crypto.randomUUID()}`,
			name: trimmedName,
			protocol,
			baseURL: trimmedBaseURL,
			apiKey: apiKey.trim() || undefined,
			customHeaders: headers,
			models: fetchedModels,
			enabled: true,
		}

		onSave(providerConfig)
		onClose()
	}

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-[480px]">
				<DialogHeader>
					<DialogTitle>
						{initialProvider ? ai.editCustomProvider : ai.addCustomProvider}
					</DialogTitle>
					<DialogDescription>{ai.customProvidersDesc}</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-2">
					<div className="space-y-1.5">
						<label
							htmlFor="custom-provider-name"
							className="text-xs font-medium text-foreground"
						>
							{ai.providerName}
						</label>
						<Input
							id="custom-provider-name"
							placeholder="e.g. My Custom OpenAI / OneAPI"
							value={name}
							onChange={(e) => setName(e.target.value)}
						/>
					</div>

					<div className="space-y-1.5">
						<label
							htmlFor="custom-provider-protocol"
							className="text-xs font-medium text-foreground"
						>
							{ai.protocol}
						</label>
						<Select
							value={protocol}
							onValueChange={(val) => setProtocol(val as AIProviderProtocol)}
						>
							<SelectTrigger id="custom-provider-protocol">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="openai">OpenAI Compatible</SelectItem>
								<SelectItem value="anthropic">Anthropic Messages</SelectItem>
								<SelectItem value="google">Google Gemini</SelectItem>
								<SelectItem value="ollama">Ollama</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-1.5">
						<label
							htmlFor="custom-provider-base-url"
							className="text-xs font-medium text-foreground"
						>
							{ai.baseUrl}
						</label>
						<Input
							id="custom-provider-base-url"
							placeholder="https://api.openai.com/v1"
							value={baseURL}
							onChange={(e) => setBaseURL(e.target.value)}
						/>
					</div>

					<div className="space-y-1.5">
						<label
							htmlFor="custom-provider-api-key"
							className="text-xs font-medium text-foreground"
						>
							API Key
						</label>
						<Input
							id="custom-provider-api-key"
							type="password"
							placeholder={ai.apiKeyPlaceholder}
							value={apiKey}
							onChange={(e) => setApiKey(e.target.value)}
						/>
					</div>

					<div className="space-y-1.5">
						<label
							htmlFor="custom-provider-custom-headers"
							className="text-xs font-medium text-foreground"
						>
							{ai.customHeaders}
						</label>
						<Input
							id="custom-provider-custom-headers"
							placeholder={ai.customHeadersPlaceholder}
							value={customHeaders}
							onChange={(e) => setCustomHeaders(e.target.value)}
						/>
					</div>

					<div className="flex items-center justify-between rounded-lg border border-border/50 p-3 bg-muted/20">
						<div className="space-y-0.5">
							<div className="text-xs font-medium">
								{ai.models} ({fetchedModels.length})
							</div>
							<div className="text-[11px] text-muted-foreground">
								{fetchedModels.length > 0
									? fetchedModels
											.map((m) => m.id)
											.slice(0, 3)
											.join(", ") + (fetchedModels.length > 3 ? "..." : "")
									: ai.noModelsAvailable}
							</div>
						</div>
						<Button
							size="sm"
							variant="outline"
							type="button"
							disabled={isFetchingModels || !baseURL.trim()}
							onClick={() => void handleFetchModels()}
						>
							{isFetchingModels ? (
								<Loader2Icon className="mr-1.5 size-3.5 animate-spin" />
							) : (
								<RefreshCcwIcon className="mr-1.5 size-3.5" />
							)}
							{isFetchingModels ? ai.fetchingModels : ai.fetchModels}
						</Button>
					</div>
				</div>

				<DialogFooter className="gap-2 sm:gap-0">
					<Button variant="outline" type="button" onClick={onClose}>
						{t.common.cancel}
					</Button>
					<Button type="button" onClick={handleSave}>
						{ai.saveProvider}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
