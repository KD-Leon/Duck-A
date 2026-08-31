import type { ApiKeyProviderId } from "@mdit/ai"
import { Button } from "@mdit/ui/components/button"
import { Input } from "@mdit/ui/components/input"
import { Settings2Icon } from "lucide-react"
import { useRef, useState } from "react"
import { useTranslation } from "@/i18n"

interface AIConnectProviderFieldProps {
	provider: ApiKeyProviderId
	isConnected: boolean
	isBusy: boolean
	customBaseURL?: string
	onConnect: (provider: ApiKeyProviderId, apiKey: string) => Promise<void>
	onDisconnect: (provider: ApiKeyProviderId) => Promise<void>
	onUpdateBaseURL?: (provider: string, baseURL: string | undefined) => void
}

export function AIConnectProviderField({
	provider,
	isConnected,
	isBusy,
	customBaseURL,
	onConnect,
	onDisconnect,
	onUpdateBaseURL,
}: AIConnectProviderFieldProps) {
	const { t } = useTranslation()
	const ai = t.settings.ai
	const inputRef = useRef<HTMLInputElement>(null)
	const [showBaseUrl, setShowBaseUrl] = useState(Boolean(customBaseURL))
	const [baseURL, setBaseURL] = useState(customBaseURL ?? "")

	const handleConnect = async () => {
		if (isBusy) {
			return
		}
		if (isConnected) {
			await onDisconnect(provider)
			if (inputRef.current) {
				inputRef.current.value = ""
			}
			return
		}
		const apiKey = inputRef.current?.value.trim()
		if (apiKey) {
			await onConnect(provider, apiKey)
		}
	}

	const handleBaseUrlChange = (value: string) => {
		setBaseURL(value)
		onUpdateBaseURL?.(provider, value.trim() || undefined)
	}

	return (
		<div className="space-y-2 w-full">
			<div className="flex items-center gap-2">
				<Input
					ref={inputRef}
					defaultValue={isConnected ? "****************" : undefined}
					type="password"
					placeholder={ai.apiKeyPlaceholder}
					autoComplete="off"
					spellCheck="false"
					disabled={isBusy}
				/>
				<Button
					variant="ghost"
					size="icon"
					type="button"
					onClick={() => setShowBaseUrl(!showBaseUrl)}
					title={ai.customBaseUrl}
					className={showBaseUrl ? "text-primary" : "text-muted-foreground"}
				>
					<Settings2Icon className="size-4" />
				</Button>
				<Button
					variant="outline"
					onClick={() => void handleConnect()}
					disabled={isBusy}
				>
					{isBusy ? ai.refreshing : isConnected ? ai.disconnect : ai.connect}
				</Button>
			</div>

			{showBaseUrl && (
				<div className="flex items-center gap-2 pl-1">
					<span className="text-[11px] text-muted-foreground whitespace-nowrap">
						Base URL:
					</span>
					<Input
						value={baseURL}
						onChange={(e) => handleBaseUrlChange(e.target.value)}
						placeholder="Default API URL"
						className="h-8 text-xs"
					/>
				</div>
			)}
		</div>
	)
}
