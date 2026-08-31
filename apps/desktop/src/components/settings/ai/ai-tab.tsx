"use client"

import type {
	ApiKeyProviderId,
	CustomProviderConfig,
	ProviderId,
} from "@mdit/ai"
import { Button } from "@mdit/ui/components/button"
import { Input } from "@mdit/ui/components/input"
import { cn } from "@mdit/ui/lib/utils"
import { openUrl } from "@tauri-apps/plugin-opener"
import { Plus, Search, Settings2, Sliders } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { useShallow } from "zustand/shallow"
import { useTranslation } from "@/i18n"
import { useStore } from "@/store"
import { useOllamaModelRefresh } from "../shared/use-ollama-model-refresh"
import { AIGeneralSettings } from "./ai-general-settings"
import { AIProviderDetail } from "./ai-provider-detail"
import {
	buildProviderModels,
	getAllPresetProviderDefinitions,
} from "./ai-provider-state"
import { CustomProviderDialog } from "./custom-provider-dialog"
import { ProviderIcon } from "./provider-icon"

export function AITab() {
	const { t } = useTranslation()
	const ai = t.settings.ai

	const {
		connectedProviders,
		apiModels,
		ollamaCompletionModels,
		customProviders,
		customBaseURLs,
		modelCapabilities,
		enabledChatModels,
		chatConfig,
		chatHistoryRounds,
		systemPrompt,
		connectProvider,
		connectCodexOAuth,
		disconnectProvider,
		fetchOllamaModels,
		addCustomProvider,
		updateCustomProvider,
		deleteCustomProvider,
		setProviderBaseURL,
		updateModelCapability,
		fetchModelsForProvider,
		toggleModelEnabled,
		selectModel,
		setChatHistoryRounds,
		setSystemPrompt,
	} = useStore(
		useShallow((state) => ({
			connectedProviders: state.connectedProviders,
			apiModels: state.apiModels,
			ollamaCompletionModels: state.ollamaCompletionModels,
			customProviders: state.customProviders,
			customBaseURLs: state.customBaseURLs,
			modelCapabilities: state.modelCapabilities,
			enabledChatModels: state.enabledChatModels,
			chatConfig: state.chatConfig,
			chatHistoryRounds: state.chatHistoryRounds,
			systemPrompt: state.systemPrompt,
			connectProvider: state.connectProvider,
			connectCodexOAuth: state.connectCodexOAuth,
			disconnectProvider: state.disconnectProvider,
			fetchOllamaModels: state.fetchOllamaModels,
			addCustomProvider: state.addCustomProvider,
			updateCustomProvider: state.updateCustomProvider,
			deleteCustomProvider: state.deleteCustomProvider,
			setProviderBaseURL: state.setProviderBaseURL,
			updateModelCapability: state.updateModelCapability,
			fetchModelsForProvider: state.fetchModelsForProvider,
			toggleModelEnabled: state.toggleModelEnabled,
			selectModel: state.selectModel,
			setChatHistoryRounds: state.setChatHistoryRounds,
			setSystemPrompt: state.setSystemPrompt,
		})),
	)

	const [activeSection, setActiveSection] = useState<"providers" | "general">(
		"providers",
	)
	const [selectedProviderId, setSelectedProviderId] = useState<string>("openai")
	const [searchProviderQuery, setSearchProviderQuery] = useState("")
	const [isCustomDialogOpen, setIsCustomDialogOpen] = useState(false)
	const [providerBusy, setProviderBusy] = useState<Record<string, boolean>>({})

	const { isRefreshingModels, refreshOllamaModels } =
		useOllamaModelRefresh(fetchOllamaModels)

	const presetDefs = useMemo(() => getAllPresetProviderDefinitions(), [])

	const providerModelsMap = useMemo(() => {
		const list = buildProviderModels(
			apiModels,
			ollamaCompletionModels,
			customProviders,
		)
		const map: Record<string, string[]> = {}
		for (const item of list) {
			map[item.provider] = item.models
		}
		return map
	}, [apiModels, ollamaCompletionModels, customProviders])

	const filteredPresetDefs = useMemo(() => {
		if (!searchProviderQuery.trim()) return presetDefs
		const q = searchProviderQuery.toLowerCase().trim()
		return presetDefs.filter(
			(p) =>
				p.label.toLowerCase().includes(q) || p.id.toLowerCase().includes(q),
		)
	}, [presetDefs, searchProviderQuery])

	const filteredCustomProviders = useMemo(() => {
		if (!searchProviderQuery.trim()) return customProviders
		const q = searchProviderQuery.toLowerCase().trim()
		return customProviders.filter(
			(p) => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q),
		)
	}, [customProviders, searchProviderQuery])

	const selectedCustomProvider = useMemo(
		() => customProviders.find((p) => p.id === selectedProviderId),
		[customProviders, selectedProviderId],
	)

	const selectedModels = providerModelsMap[selectedProviderId] ?? []

	const runWithBusy = async (provider: string, action: () => Promise<void>) => {
		setProviderBusy((prev) => ({ ...prev, [provider]: true }))
		try {
			await action()
		} catch (error) {
			console.error(`Failed to process provider action (${provider}):`, error)
			toast.error(`Failed to process provider action (${provider}).`)
		} finally {
			setProviderBusy((prev) => ({ ...prev, [provider]: false }))
		}
	}

	const handleConnectApiKey = async (
		targetProvider: ApiKeyProviderId,
		apiKey: string,
	) => {
		await runWithBusy(targetProvider, async () => {
			await connectProvider(targetProvider, apiKey)
			toast.success("Connected successfully.")
		})
	}

	const handleDisconnect = async (targetProvider: ProviderId) => {
		await runWithBusy(targetProvider, async () => {
			await disconnectProvider(targetProvider)
			toast.success("Disconnected.")
		})
	}

	const handleConnectOAuth = async (targetProvider: ProviderId) => {
		await runWithBusy(targetProvider, async () => {
			await connectCodexOAuth()
		})
	}

	const handleFetchModels = async (providerId: string) => {
		if (providerId === "ollama") {
			await runWithBusy("ollama", async () => {
				await refreshOllamaModels()
			})
			return
		}
		await runWithBusy(providerId, async () => {
			await fetchModelsForProvider(providerId)
			toast.success(ai.modelsFetched)
		})
	}

	const handleAddCustomProvider = (config: CustomProviderConfig) => {
		addCustomProvider(config)
		setSelectedProviderId(config.id)
		toast.success(`Custom provider "${config.name}" added.`)
	}

	return (
		<div className="flex flex-1 flex-col h-full overflow-hidden bg-background">
			{/* Top Bar with Section Switcher & Active Model Badge */}
			<div className="flex items-center justify-between border-b border-border/60 px-6 py-3 shrink-0 bg-muted/10">
				<div className="flex items-center gap-1.5 p-0.5 rounded-lg bg-muted/50 border border-border/40">
					<button
						type="button"
						onClick={() => setActiveSection("providers")}
						className={cn(
							"flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer",
							activeSection === "providers"
								? "bg-background text-foreground shadow-xs"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						<Sliders className="size-3.5" />
						<span>{ai.providers}</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveSection("general")}
						className={cn(
							"flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer",
							activeSection === "general"
								? "bg-background text-foreground shadow-xs"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						<Settings2 className="size-3.5" />
						<span>{ai.generalSettings}</span>
					</button>
				</div>

				{/* Active Model Indicator */}
				<div className="flex items-center gap-2 text-xs">
					<span className="text-muted-foreground hidden sm:inline">
						{ai.chatModel}:
					</span>
					{chatConfig ? (
						<div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary font-mono text-[11px] font-medium">
							<ProviderIcon providerId={chatConfig.provider} size="sm" />
							<span>{chatConfig.model}</span>
						</div>
					) : (
						<span className="text-muted-foreground italic">
							{ai.noModelsAvailable}
						</span>
					)}
				</div>
			</div>

			{/* Main Content Area */}
			{activeSection === "general" ? (
				<AIGeneralSettings
					chatConfig={chatConfig}
					enabledChatModels={enabledChatModels}
					chatHistoryRounds={chatHistoryRounds}
					systemPrompt={systemPrompt}
					onSelectModel={selectModel}
					onSetChatHistoryRounds={setChatHistoryRounds}
					onSetSystemPrompt={setSystemPrompt}
				/>
			) : (
				<div className="flex flex-1 min-h-0 overflow-hidden">
					{/* Left Sidebar: Provider List */}
					<div className="w-[230px] shrink-0 border-r border-border/60 flex flex-col bg-muted/10 overflow-hidden">
						{/* Search & Add Button */}
						<div className="p-3 space-y-2 border-b border-border/40 shrink-0">
							<div className="relative">
								<Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
								<Input
									value={searchProviderQuery}
									onChange={(e) => setSearchProviderQuery(e.target.value)}
									placeholder={ai.searchProviders}
									className="h-8 pl-8 text-xs bg-background"
								/>
							</div>

							<Button
								variant="outline"
								size="sm"
								className="w-full justify-start text-xs h-8 text-muted-foreground hover:text-foreground"
								onClick={() => setIsCustomDialogOpen(true)}
							>
								<Plus className="size-3.5 mr-1.5" />
								{ai.addCustomProvider}
							</Button>
						</div>

						{/* Provider Items Scrollable List */}
						<div className="flex-1 overflow-y-auto p-2 space-y-4">
							{/* Preset Providers */}
							<div className="space-y-1">
								<div className="px-2 py-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
									Presets
								</div>
								{filteredPresetDefs.map((def) => {
									const isConnected =
										def.id === "ollama"
											? true
											: connectedProviders.includes(def.id as ProviderId)
									const isSelected = selectedProviderId === def.id
									const activeCount = (providerModelsMap[def.id] ?? []).filter(
										(m) =>
											enabledChatModels.some(
												(em) => em.provider === def.id && em.model === m,
											),
									).length

									return (
										<button
											key={def.id}
											type="button"
											onClick={() => setSelectedProviderId(def.id)}
											className={cn(
												"w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-left transition-all cursor-pointer",
												isSelected
													? "bg-primary/10 text-primary font-medium border border-primary/20 shadow-2xs"
													: "hover:bg-muted/60 text-foreground border border-transparent",
											)}
										>
											<div className="flex items-center gap-2.5 min-w-0">
												<ProviderIcon providerId={def.id} size="sm" />
												<span className="text-xs truncate">{def.label}</span>
											</div>

											<div className="flex items-center gap-1.5 shrink-0">
												{activeCount > 0 && (
													<span className="text-[10px] font-mono text-muted-foreground">
														{activeCount}
													</span>
												)}
												<span
													className={cn(
														"size-1.5 rounded-full",
														isConnected
															? "bg-emerald-500"
															: "bg-muted-foreground/30",
													)}
												/>
											</div>
										</button>
									)
								})}
							</div>

							{/* Custom Providers */}
							{filteredCustomProviders.length > 0 && (
								<div className="space-y-1 pt-2 border-t border-border/40">
									<div className="px-2 py-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
										{ai.customProviders}
									</div>
									{filteredCustomProviders.map((cp) => {
										const isSelected = selectedProviderId === cp.id
										const activeCount = cp.models.filter((m) =>
											enabledChatModels.some(
												(em) => em.provider === cp.id && em.model === m.id,
											),
										).length

										return (
											<button
												key={cp.id}
												type="button"
												onClick={() => setSelectedProviderId(cp.id)}
												className={cn(
													"w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-left transition-all cursor-pointer",
													isSelected
														? "bg-primary/10 text-primary font-medium border border-primary/20 shadow-2xs"
														: "hover:bg-muted/60 text-foreground border border-transparent",
												)}
											>
												<div className="flex items-center gap-2.5 min-w-0">
													<ProviderIcon providerId={cp.id} size="sm" />
													<span className="text-xs truncate">{cp.name}</span>
												</div>

												<div className="flex items-center gap-1.5 shrink-0">
													{activeCount > 0 && (
														<span className="text-[10px] font-mono text-muted-foreground">
															{activeCount}
														</span>
													)}
													<span className="size-1.5 rounded-full bg-emerald-500" />
												</div>
											</button>
										)
									})}
								</div>
							)}
						</div>
					</div>

					{/* Right Detail Pane */}
					<AIProviderDetail
						key={selectedProviderId}
						providerId={selectedProviderId}
						isConnected={
							selectedProviderId === "ollama" ||
							Boolean(selectedCustomProvider) ||
							connectedProviders.includes(selectedProviderId as ProviderId)
						}
						isBusy={Boolean(
							providerBusy[selectedProviderId] || isRefreshingModels,
						)}
						customProvider={selectedCustomProvider}
						customBaseURL={customBaseURLs[selectedProviderId]}
						models={selectedModels}
						enabledModels={enabledChatModels}
						modelCapabilities={modelCapabilities}
						onConnectApiKey={handleConnectApiKey}
						onDisconnect={handleDisconnect}
						onConnectOAuth={handleConnectOAuth}
						onSetBaseURL={setProviderBaseURL}
						onToggleModel={toggleModelEnabled}
						onUpdateCapability={updateModelCapability}
						onFetchModels={handleFetchModels}
						onOpenUrl={(url) => void openUrl(url)}
						onUpdateCustomProvider={updateCustomProvider}
						onDeleteCustomProvider={(id) => {
							deleteCustomProvider(id)
							setSelectedProviderId("openai")
							toast.success("Custom provider deleted.")
						}}
					/>
				</div>
			)}

			<CustomProviderDialog
				isOpen={isCustomDialogOpen}
				onClose={() => setIsCustomDialogOpen(false)}
				onSave={handleAddCustomProvider}
			/>
		</div>
	)
}
