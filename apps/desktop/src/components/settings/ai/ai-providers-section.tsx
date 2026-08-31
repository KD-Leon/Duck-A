import type {
	ApiKeyProviderId,
	CustomProviderConfig,
	ProviderId,
} from "@mdit/ai"
import { Button } from "@mdit/ui/components/button"
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "@mdit/ui/components/field"
import {
	Edit2Icon,
	ExternalLink,
	Loader2Icon,
	PlusIcon,
	RefreshCcwIcon,
	Trash2Icon,
} from "lucide-react"
import { useState } from "react"
import { useTranslation } from "@/i18n"
import { AIConnectProviderField } from "./ai-connect-provider-field"
import type { CredentialProviderDefinition } from "./ai-provider-state"
import { CustomProviderDialog } from "./custom-provider-dialog"

interface AIProvidersSectionProps {
	credentialProviderDefinitions: CredentialProviderDefinition[]
	connectedProviders: ProviderId[]
	customProviders: CustomProviderConfig[]
	customBaseURLs: Record<string, string>
	providerBusy: Partial<Record<string, boolean>>
	isRefreshingModels: boolean
	onOpenSettingsUrl: (url: string) => void
	onConnectOAuth: (provider: ProviderId) => Promise<void>
	onConnectProvider: (
		provider: ApiKeyProviderId,
		apiKey: string,
	) => Promise<void>
	onDisconnectProvider: (provider: ProviderId) => Promise<void>
	onRefreshOllamaModels: () => Promise<void>
	onAddCustomProvider: (provider: CustomProviderConfig) => void
	onUpdateCustomProvider: (provider: CustomProviderConfig) => void
	onDeleteCustomProvider: (providerId: string) => void
	onSetProviderBaseURL: (provider: string, baseURL?: string) => void
	onFetchModelsForProvider: (providerId: string) => Promise<void>
}

export function AIProvidersSection({
	credentialProviderDefinitions,
	connectedProviders,
	customProviders,
	customBaseURLs,
	providerBusy,
	isRefreshingModels,
	onOpenSettingsUrl,
	onConnectOAuth,
	onConnectProvider,
	onDisconnectProvider,
	onRefreshOllamaModels,
	onAddCustomProvider,
	onUpdateCustomProvider,
	onDeleteCustomProvider,
	onSetProviderBaseURL,
	onFetchModelsForProvider,
}: AIProvidersSectionProps) {
	const { t } = useTranslation()
	const ai = t.settings.ai

	const [isCustomDialogOpen, setIsCustomDialogOpen] = useState(false)
	const [editingCustomProvider, setEditingCustomProvider] =
		useState<CustomProviderConfig | null>(null)

	const handleOpenAddCustom = () => {
		setEditingCustomProvider(null)
		setIsCustomDialogOpen(true)
	}

	const handleOpenEditCustom = (cp: CustomProviderConfig) => {
		setEditingCustomProvider(cp)
		setIsCustomDialogOpen(true)
	}

	const handleSaveCustom = (provider: CustomProviderConfig) => {
		if (editingCustomProvider) {
			onUpdateCustomProvider(provider)
		} else {
			onAddCustomProvider(provider)
		}
	}

	return (
		<FieldSet className="mt-8">
			<FieldLegend>{ai.providers}</FieldLegend>
			<FieldDescription>{ai.providersDesc}</FieldDescription>
			<FieldGroup>
				{credentialProviderDefinitions.map((definition) => {
					const isConnected = connectedProviders.includes(definition.id)
					const isBusy = Boolean(providerBusy[definition.id])

					return (
						<Field key={definition.id}>
							<FieldLabel
								className={
									definition.settingsUrl
										? "cursor-pointer hover:text-blue-500"
										: undefined
								}
								onClick={() => {
									if (!definition.settingsUrl) {
										return
									}
									onOpenSettingsUrl(definition.settingsUrl)
								}}
							>
								{definition.label}
								{definition.settingsUrl && (
									<ExternalLink className="size-3 inline ml-1" />
								)}
							</FieldLabel>

							{definition.authKind === "oauth" ? (
								<div className="flex items-center gap-2">
									<Button
										variant="outline"
										disabled={isBusy}
										onClick={() => {
											if (isConnected) {
												void onDisconnectProvider(definition.id)
												return
											}
											void onConnectOAuth(definition.id)
										}}
									>
										{isBusy
											? ai.refreshing
											: isConnected
												? ai.disconnect
												: ai.connect}
									</Button>
								</div>
							) : (
								<AIConnectProviderField
									provider={definition.id as ApiKeyProviderId}
									isConnected={isConnected}
									isBusy={isBusy}
									customBaseURL={customBaseURLs[definition.id]}
									onConnect={onConnectProvider}
									onDisconnect={async (provider) =>
										onDisconnectProvider(provider)
									}
									onUpdateBaseURL={onSetProviderBaseURL}
								/>
							)}
						</Field>
					)
				})}

				{/* Custom Providers Section */}
				<div className="mt-8 space-y-4">
					<div className="flex items-center justify-between border-b pb-2">
						<div>
							<h4 className="text-sm font-medium">{ai.customProviders}</h4>
							<p className="text-xs text-muted-foreground">
								{ai.customProvidersDesc}
							</p>
						</div>
						<Button
							size="sm"
							variant="outline"
							onClick={handleOpenAddCustom}
							type="button"
						>
							<PlusIcon className="mr-1.5 size-3.5" />
							{ai.addCustomProvider}
						</Button>
					</div>

					{customProviders.length === 0 ? (
						<div className="py-2 text-xs text-muted-foreground">
							{ai.noConnectedProviders}
						</div>
					) : (
						<div className="space-y-3">
							{customProviders.map((cp) => {
								const isBusy = Boolean(providerBusy[cp.id])
								return (
									<div
										key={cp.id}
										className="flex flex-col gap-2 rounded-lg border border-border/60 p-3 bg-muted/20"
									>
										<div className="flex items-center justify-between">
											<div>
												<span className="text-sm font-medium">{cp.name}</span>
												<span className="ml-2 rounded-md bg-secondary px-2 py-0.5 text-[11px] font-mono text-secondary-foreground">
													{cp.protocol}
												</span>
											</div>
											<div className="flex items-center gap-1.5">
												<Button
													size="sm"
													variant="ghost"
													disabled={isBusy}
													onClick={() => void onFetchModelsForProvider(cp.id)}
													title={ai.fetchModels}
												>
													{isBusy ? (
														<Loader2Icon className="size-3.5 animate-spin" />
													) : (
														<RefreshCcwIcon className="size-3.5" />
													)}
												</Button>
												<Button
													size="sm"
													variant="ghost"
													onClick={() => handleOpenEditCustom(cp)}
													title={ai.editCustomProvider}
												>
													<Edit2Icon className="size-3.5" />
												</Button>
												<Button
													size="sm"
													variant="ghost"
													className="text-destructive hover:text-destructive"
													onClick={() => onDeleteCustomProvider(cp.id)}
													title={ai.deleteCustomProvider}
												>
													<Trash2Icon className="size-3.5" />
												</Button>
											</div>
										</div>
										<div className="text-xs text-muted-foreground truncate">
											{cp.baseURL}
										</div>
										{cp.models.length > 0 && (
											<div className="text-[11px] text-muted-foreground">
												{ai.models}: {cp.models.map((m) => m.id).join(", ")}
											</div>
										)}
									</div>
								)
							})}
						</div>
					)}
				</div>

				<Field orientation="horizontal" className="mt-8">
					<FieldContent>
						<FieldLabel>Ollama</FieldLabel>
						<FieldDescription>
							Fetch models from your local Ollama instance when needed
						</FieldDescription>
					</FieldContent>
					<Button
						variant="outline"
						disabled={isRefreshingModels}
						onClick={() => void onRefreshOllamaModels()}
					>
						{isRefreshingModels ? (
							<Loader2Icon className="size-4 animate-spin" />
						) : (
							<RefreshCcwIcon className="size-4" />
						)}
						{isRefreshingModels ? ai.refreshing : ai.refreshModels}
					</Button>
				</Field>
			</FieldGroup>

			<CustomProviderDialog
				isOpen={isCustomDialogOpen}
				onClose={() => setIsCustomDialogOpen(false)}
				onSave={handleSaveCustom}
				initialProvider={editingCustomProvider}
			/>
		</FieldSet>
	)
}
