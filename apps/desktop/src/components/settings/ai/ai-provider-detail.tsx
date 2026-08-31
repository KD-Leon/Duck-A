"use client"

import type {
	ApiKeyProviderId,
	CustomProviderConfig,
	ModelCapability,
	ProviderId,
} from "@mdit/ai"
import { AI_PROVIDER_DEFINITIONS } from "@mdit/ai"
import { Button } from "@mdit/ui/components/button"
import { Checkbox } from "@mdit/ui/components/checkbox"
import { Input } from "@mdit/ui/components/input"
import { Switch } from "@mdit/ui/components/switch"
import { cn } from "@mdit/ui/lib/utils"
import {
	Brain,
	ChevronDown,
	ChevronUp,
	ExternalLink,
	Eye,
	EyeOff,
	Image as ImageIcon,
	Loader2Icon,
	PlusIcon,
	RefreshCcw,
	Search,
	Sliders,
	Trash2,
	Wrench,
} from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { useTranslation } from "@/i18n"
import { ProviderIcon } from "./provider-icon"

interface AIProviderDetailProps {
	providerId: string
	isConnected: boolean
	isBusy: boolean
	customProvider?: CustomProviderConfig
	customBaseURL?: string
	models: string[]
	enabledModels: { provider: string; model: string }[]
	modelCapabilities: Record<string, ModelCapability>
	onConnectApiKey: (provider: ApiKeyProviderId, apiKey: string) => Promise<void>
	onDisconnect: (provider: ProviderId) => Promise<void>
	onConnectOAuth: (provider: ProviderId) => Promise<void>
	onSetBaseURL: (provider: string, baseURL?: string) => void
	onToggleModel: (provider: string, model: string, checked: boolean) => void
	onUpdateCapability: (
		provider: string,
		model: string,
		caps: Partial<ModelCapability>,
	) => void
	onFetchModels: (providerId: string) => Promise<void>
	onOpenUrl: (url: string) => void
	onUpdateCustomProvider?: (provider: CustomProviderConfig) => void
	onDeleteCustomProvider?: (id: string) => void
}

export function AIProviderDetail({
	providerId,
	isConnected,
	isBusy,
	customProvider,
	customBaseURL,
	models,
	enabledModels,
	modelCapabilities,
	onConnectApiKey,
	onDisconnect,
	onConnectOAuth,
	onSetBaseURL,
	onToggleModel,
	onUpdateCapability,
	onFetchModels,
	onOpenUrl,
	onUpdateCustomProvider,
	onDeleteCustomProvider,
}: AIProviderDetailProps) {
	const { t } = useTranslation()
	const ai = t.settings.ai

	const [showApiKey, setShowApiKey] = useState(false)
	const [apiKeyInput, setApiKeyInput] = useState("")
	const [baseUrlInput, setBaseUrlInput] = useState(customBaseURL ?? "")
	const [searchModelQuery, setSearchModelQuery] = useState("")
	const [newModelIdInput, setNewModelIdInput] = useState("")
	const [showAddModel, setShowAddModel] = useState(false)
	const [expandedModelId, setExpandedModelId] = useState<string | null>(null)

	const presetDef = (AI_PROVIDER_DEFINITIONS as any)[providerId]
	const isCustom = Boolean(customProvider)
	const providerName = customProvider?.name ?? presetDef?.label ?? providerId
	const defaultBaseUrl = presetDef?.defaultBaseURL ?? ""
	const settingsUrl = presetDef?.settingsUrl

	const filteredModels = useMemo(() => {
		if (!searchModelQuery.trim()) return models
		const q = searchModelQuery.toLowerCase().trim()
		return models.filter((m) => m.toLowerCase().includes(q))
	}, [models, searchModelQuery])

	const activeModelCount = useMemo(
		() =>
			models.filter((m) =>
				enabledModels.some(
					(em) => em.provider === providerId && em.model === m,
				),
			).length,
		[models, enabledModels, providerId],
	)

	const handleSaveBaseUrl = (val: string) => {
		setBaseUrlInput(val)
		onSetBaseURL(providerId, val.trim() || undefined)
	}

	const handleResetBaseUrl = () => {
		setBaseUrlInput("")
		onSetBaseURL(providerId, undefined)
		toast.success(ai.resetDefault)
	}

	const handleConnect = async () => {
		if (isBusy) return
		if (isConnected) {
			await onDisconnect(providerId as ProviderId)
			setApiKeyInput("")
			return
		}
		if (presetDef?.authKind === "oauth") {
			await onConnectOAuth(providerId as ProviderId)
			return
		}
		const key = apiKeyInput.trim()
		if (!key) {
			toast.error(ai.apiKeyPlaceholder)
			return
		}
		await onConnectApiKey(providerId as ApiKeyProviderId, key)
	}

	const handleAddModel = () => {
		const trimmed = newModelIdInput.trim()
		if (!trimmed) return

		if (isCustom && customProvider && onUpdateCustomProvider) {
			if (!customProvider.models.some((m) => m.id === trimmed)) {
				const nextModels = [
					...customProvider.models,
					{
						id: trimmed,
						vision: true,
						toolCall: true,
						contextWindow: 128000,
						maxOutputTokens: 4096,
					},
				]
				onUpdateCustomProvider({
					...customProvider,
					models: nextModels,
				})
			}
		}

		onToggleModel(providerId, trimmed, true)
		setNewModelIdInput("")
		setShowAddModel(false)
		toast.success(`Model "${trimmed}" added`)
	}

	return (
		<div className="flex flex-1 flex-col overflow-y-auto p-6 space-y-6">
			{/* Provider Header */}
			<div className="flex items-start justify-between border-b border-border/40 pb-4">
				<div className="flex items-center gap-3.5">
					<ProviderIcon providerId={providerId} size="lg" />
					<div>
						<div className="flex items-center gap-2">
							<h3 className="text-base font-semibold tracking-tight text-foreground">
								{providerName}
							</h3>
							{customProvider && (
								<span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-mono text-muted-foreground border border-border/50">
									{customProvider.protocol}
								</span>
							)}
						</div>
						<div className="flex items-center gap-3 mt-1 text-xs">
							<span
								className={cn(
									"inline-flex items-center gap-1.5 font-medium",
									isConnected || isCustom
										? "text-foreground"
										: "text-muted-foreground",
								)}
							>
								<span
									className={cn(
										"size-2 rounded-full",
										isConnected || isCustom ? "bg-emerald-500" : "bg-border",
									)}
								/>
								{isConnected || isCustom
									? ai.connected
									: ai.noConnectedProviders}
							</span>
							{settingsUrl && (
								<button
									type="button"
									onClick={() => onOpenUrl(settingsUrl)}
									className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
								>
									<span>{ai.getApiKey}</span>
									<ExternalLink className="size-3" />
								</button>
							)}
						</div>
					</div>
				</div>

				<div className="flex items-center gap-2">
					{isCustom && onDeleteCustomProvider && (
						<Button
							variant="outline"
							size="sm"
							className="text-destructive hover:bg-destructive/10 border-border/60 text-xs"
							onClick={() => onDeleteCustomProvider(providerId)}
						>
							<Trash2 className="size-3.5 mr-1.5" />
							{ai.deleteCustomProvider}
						</Button>
					)}
				</div>
			</div>

			{/* API Credentials Card */}
			<div className="rounded-xl border border-border/60 bg-card p-4 space-y-4">
				<h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
					{ai.providerConfig}
				</h4>

				{presetDef?.authKind === "oauth" ? (
					<div className="flex items-center justify-between py-2">
						<div className="space-y-0.5">
							<div className="text-sm font-medium">ChatGPT Codex OAuth</div>
							<div className="text-xs text-muted-foreground">
								Sign in with your OpenAI account to use Codex models
							</div>
						</div>
						<Button
							variant={isConnected ? "outline" : "default"}
							disabled={isBusy}
							onClick={() => void handleConnect()}
						>
							{isBusy ? (
								<Loader2Icon className="size-4 animate-spin mr-1.5" />
							) : null}
							{isConnected ? ai.disconnect : ai.connect}
						</Button>
					</div>
				) : providerId === "ollama" ? (
					<div className="space-y-3">
						<div className="space-y-1.5">
							<label
								htmlFor="ollama-host-url"
								className="text-xs font-medium text-foreground"
							>
								Ollama Host URL
							</label>
							<div className="flex items-center gap-2">
								<Input
									id="ollama-host-url"
									value={baseUrlInput}
									onChange={(e) => handleSaveBaseUrl(e.target.value)}
									placeholder="http://localhost:11434"
									className="text-xs font-mono bg-background"
								/>
								{baseUrlInput && (
									<Button
										variant="ghost"
										size="sm"
										onClick={handleResetBaseUrl}
										title={ai.resetDefault}
									>
										{ai.resetDefault}
									</Button>
								)}
							</div>
						</div>
					</div>
				) : (
					<div className="space-y-3">
						{/* API Key */}
						<div className="space-y-1.5">
							<div className="flex items-center justify-between">
								<label
									htmlFor={`provider-api-key-${providerId}`}
									className="text-xs font-medium text-foreground"
								>
									API Key
								</label>
							</div>
							<div className="flex items-center gap-2">
								<div className="relative flex-1">
									<Input
										id={`provider-api-key-${providerId}`}
										type={showApiKey ? "text" : "password"}
										value={apiKeyInput}
										onChange={(e) => setApiKeyInput(e.target.value)}
										placeholder={
											isConnected
												? "••••••••••••••••••••••••"
												: ai.apiKeyPlaceholder
										}
										className="text-xs font-mono pr-9 bg-background"
									/>
									<button
										type="button"
										onClick={() => setShowApiKey(!showApiKey)}
										className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
									>
										{showApiKey ? (
											<EyeOff className="size-4" />
										) : (
											<Eye className="size-4" />
										)}
									</button>
								</div>
								<Button
									variant={isConnected ? "outline" : "default"}
									disabled={isBusy || (!isConnected && !apiKeyInput.trim())}
									onClick={() => void handleConnect()}
									className="text-xs shrink-0"
								>
									{isBusy ? (
										<Loader2Icon className="size-4 animate-spin mr-1.5" />
									) : null}
									{isConnected ? ai.disconnect : ai.connect}
								</Button>
							</div>
						</div>

						{/* Base URL Override */}
						<div className="space-y-1.5 pt-1">
							<div className="flex items-center justify-between">
								<label
									htmlFor={`provider-base-url-${providerId}`}
									className="text-xs font-medium text-foreground"
								>
									{ai.baseUrl}
								</label>
								{baseUrlInput && (
									<button
										type="button"
										onClick={handleResetBaseUrl}
										className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
									>
										{ai.resetDefault}
									</button>
								)}
							</div>
							<Input
								id={`provider-base-url-${providerId}`}
								value={baseUrlInput}
								onChange={(e) => handleSaveBaseUrl(e.target.value)}
								placeholder={defaultBaseUrl || "https://api.openai.com/v1"}
								className="text-xs font-mono bg-background"
							/>
						</div>
					</div>
				)}
			</div>

			{/* Models & Capabilities Card */}
			<div className="rounded-xl border border-border/60 bg-card p-4 space-y-4">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
					<div className="flex items-center gap-2">
						<h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
							{ai.models}
						</h4>
						<span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-foreground border border-border/40">
							{activeModelCount} / {models.length} {ai.activeModels}
						</span>
					</div>

					<div className="flex items-center gap-2">
						<Button
							size="sm"
							variant="outline"
							disabled={isBusy}
							onClick={() => void onFetchModels(providerId)}
							className="text-xs h-8"
						>
							{isBusy ? (
								<Loader2Icon className="size-3.5 animate-spin mr-1.5" />
							) : (
								<RefreshCcw className="size-3.5 mr-1.5" />
							)}
							{isBusy ? ai.fetchingModels : ai.fetchModels}
						</Button>

						<Button
							size="sm"
							variant="outline"
							onClick={() => setShowAddModel(!showAddModel)}
							className="text-xs h-8"
						>
							<PlusIcon className="size-3.5 mr-1" />
							{ai.addCustomModel}
						</Button>
					</div>
				</div>

				{/* Search and Add Model Bar */}
				<div className="flex items-center gap-2">
					<div className="relative flex-1">
						<Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
						<Input
							value={searchModelQuery}
							onChange={(e) => setSearchModelQuery(e.target.value)}
							placeholder={ai.searchModels}
							className="h-8 pl-8 text-xs bg-background"
						/>
					</div>
				</div>

				{showAddModel && (
					<div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-2.5">
						<Input
							value={newModelIdInput}
							onChange={(e) => setNewModelIdInput(e.target.value)}
							placeholder={ai.modelIdPlaceholder}
							className="h-8 text-xs font-mono bg-background"
							onKeyDown={(e) => {
								if (e.key === "Enter") handleAddModel()
							}}
						/>
						<Button size="sm" onClick={handleAddModel} className="h-8 text-xs">
							{ai.addCustomModel}
						</Button>
					</div>
				)}

				{/* Model List */}
				{filteredModels.length === 0 ? (
					<div className="py-8 text-center text-xs text-muted-foreground">
						{models.length === 0 ? ai.noModelsAvailable : "No matching models"}
					</div>
				) : (
					<div className="space-y-2">
						{filteredModels.map((model) => {
							const isEnabled = enabledModels.some(
								(em) => em.provider === providerId && em.model === model,
							)
							const capKey = `${providerId}:${model}`
							const caps = modelCapabilities[capKey]
							const hasVision = caps?.vision ?? false
							const hasTools = caps?.toolCall ?? false
							const hasReasoning = caps?.reasoning ?? false
							const contextWindow = caps?.contextWindow ?? 128000
							const maxOutputTokens = caps?.maxOutputTokens ?? 4096
							const temperature = caps?.temperature ?? 0.7
							const isExpanded = expandedModelId === model

							return (
								<div
									key={model}
									className={cn(
										"rounded-lg border transition-all overflow-hidden",
										isEnabled
											? "border-border/80 bg-card shadow-2xs"
											: "border-border/30 bg-muted/15 opacity-75 hover:opacity-100",
									)}
								>
									{/* Main Model Row */}
									<div className="flex items-center justify-between p-3 gap-3">
										<div className="space-y-1 min-w-0 flex-1">
											<div className="flex items-center gap-2">
												<span className="text-xs font-mono font-medium truncate text-foreground">
													{model}
												</span>
											</div>

											{/* Capability Badges & Quick Stats */}
											<div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[10px]">
												<span
													className={cn(
														"inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 border font-medium",
														hasVision
															? "bg-foreground/5 text-foreground border-border"
															: "bg-muted/40 text-muted-foreground/50 border-transparent",
													)}
												>
													<ImageIcon className="size-3" />
													<span>Vision</span>
												</span>

												<span
													className={cn(
														"inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 border font-medium",
														hasTools
															? "bg-foreground/5 text-foreground border-border"
															: "bg-muted/40 text-muted-foreground/50 border-transparent",
													)}
												>
													<Wrench className="size-3" />
													<span>Tools</span>
												</span>

												<span
													className={cn(
														"inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 border font-medium",
														hasReasoning
															? "bg-foreground/5 text-foreground border-border"
															: "bg-muted/40 text-muted-foreground/50 border-transparent",
													)}
												>
													<Brain className="size-3" />
													<span>Reasoning</span>
												</span>

												<span className="text-muted-foreground/80 font-mono pl-1">
													Ctx: {Math.round(contextWindow / 1000)}k
												</span>
												<span className="text-muted-foreground/80 font-mono">
													MaxOut: {Math.round(maxOutputTokens / 1000)}k
												</span>
											</div>
										</div>

										<div className="flex items-center gap-2 shrink-0">
											<Button
												variant="ghost"
												size="sm"
												onClick={() =>
													setExpandedModelId(isExpanded ? null : model)
												}
												className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
												title="Edit model parameters"
											>
												<Sliders className="size-3.5 mr-1" />
												<span>参数</span>
												{isExpanded ? (
													<ChevronUp className="size-3 ml-0.5" />
												) : (
													<ChevronDown className="size-3 ml-0.5" />
												)}
											</Button>

											<Switch
												checked={isEnabled}
												onCheckedChange={(checked) =>
													onToggleModel(providerId, model, checked)
												}
											/>
										</div>
									</div>

									{/* Expanded Model Parameters & Capabilities Configuration */}
									{isExpanded && (
										<div className="border-t border-border/50 bg-muted/20 p-4 space-y-4">
											{/* Feature Switches */}
											<div className="space-y-2">
												<div className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
													{ai.capabilitiesLabel}
												</div>
												<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
													{/* Vision Checkbox */}
													<label
														htmlFor={`${providerId}-${model}-vision`}
														className="flex items-center gap-2 rounded-lg border border-border/60 bg-background p-2.5 cursor-pointer hover:bg-muted/30 transition-colors"
													>
														<Checkbox
															id={`${providerId}-${model}-vision`}
															checked={hasVision}
															onCheckedChange={(checked) =>
																onUpdateCapability(providerId, model, {
																	vision: Boolean(checked),
																})
															}
														/>
														<div className="space-y-0.5">
															<div className="text-xs font-medium">
																{ai.visionCapability}
															</div>
															<div className="text-[10px] text-muted-foreground">
																图片识别 / 上传
															</div>
														</div>
													</label>

													{/* Tool Call Checkbox */}
													<label
														htmlFor={`${providerId}-${model}-tools`}
														className="flex items-center gap-2 rounded-lg border border-border/60 bg-background p-2.5 cursor-pointer hover:bg-muted/30 transition-colors"
													>
														<Checkbox
															id={`${providerId}-${model}-tools`}
															checked={hasTools}
															onCheckedChange={(checked) =>
																onUpdateCapability(providerId, model, {
																	toolCall: Boolean(checked),
																})
															}
														/>
														<div className="space-y-0.5">
															<div className="text-xs font-medium">
																{ai.toolsCapability}
															</div>
															<div className="text-[10px] text-muted-foreground">
																Agent 工具调用
															</div>
														</div>
													</label>

													{/* Reasoning Checkbox */}
													<label
														htmlFor={`${providerId}-${model}-reasoning`}
														className="flex items-center gap-2 rounded-lg border border-border/60 bg-background p-2.5 cursor-pointer hover:bg-muted/30 transition-colors"
													>
														<Checkbox
															id={`${providerId}-${model}-reasoning`}
															checked={hasReasoning}
															onCheckedChange={(checked) =>
																onUpdateCapability(providerId, model, {
																	reasoning: Boolean(checked),
																})
															}
														/>
														<div className="space-y-0.5">
															<div className="text-xs font-medium">
																{ai.reasoningCapability}
															</div>
															<div className="text-[10px] text-muted-foreground">
																展示思维链过程
															</div>
														</div>
													</label>
												</div>
											</div>

											{/* Detailed Numeric Parameters */}
											<div className="space-y-3 pt-2 border-t border-border/40">
												<div className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
													{ai.modelParameters}
												</div>

												<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
													{/* Context Window (Tokens) */}
													<div className="space-y-1.5">
														<div className="flex items-center justify-between">
															<label
																htmlFor={`${providerId}-${model}-ctx`}
																className="text-xs font-medium text-foreground"
															>
																{ai.contextWindowLabel}
															</label>
															<span className="text-[11px] font-mono text-muted-foreground">
																{Math.round(contextWindow / 1000)}k tokens
															</span>
														</div>
														<Input
															id={`${providerId}-${model}-ctx`}
															type="number"
															value={contextWindow}
															onChange={(e) =>
																onUpdateCapability(providerId, model, {
																	contextWindow: Number(e.target.value),
																})
															}
															className="h-8 text-xs font-mono bg-background"
														/>
														{/* Quick Preset Buttons */}
														<div className="flex items-center gap-1.5 pt-1">
															{[32768, 65536, 128000, 200000, 1048576].map(
																(val) => (
																	<button
																		key={val}
																		type="button"
																		onClick={() =>
																			onUpdateCapability(providerId, model, {
																				contextWindow: val,
																			})
																		}
																		className={cn(
																			"px-1.5 py-0.5 rounded text-[10px] font-mono border transition-all cursor-pointer",
																			contextWindow === val
																				? "bg-foreground text-background border-foreground font-medium"
																				: "bg-background text-muted-foreground hover:text-foreground border-border/60",
																		)}
																	>
																		{val >= 1000000
																			? `${Math.round(val / 1000000)}M`
																			: `${Math.round(val / 1000)}k`}
																	</button>
																),
															)}
														</div>
													</div>

													{/* Max Output Tokens */}
													<div className="space-y-1.5">
														<div className="flex items-center justify-between">
															<label
																htmlFor={`${providerId}-${model}-maxout`}
																className="text-xs font-medium text-foreground"
															>
																{ai.maxOutputTokensLabel}
															</label>
															<span className="text-[11px] font-mono text-muted-foreground">
																{maxOutputTokens} tokens
															</span>
														</div>
														<Input
															id={`${providerId}-${model}-maxout`}
															type="number"
															value={maxOutputTokens}
															onChange={(e) =>
																onUpdateCapability(providerId, model, {
																	maxOutputTokens: Number(e.target.value),
																})
															}
															className="h-8 text-xs font-mono bg-background"
														/>
														{/* Quick Preset Buttons */}
														<div className="flex items-center gap-1.5 pt-1">
															{[2048, 4096, 8192, 16384, 65536].map((val) => (
																<button
																	key={val}
																	type="button"
																	onClick={() =>
																		onUpdateCapability(providerId, model, {
																			maxOutputTokens: val,
																		})
																	}
																	className={cn(
																		"px-1.5 py-0.5 rounded text-[10px] font-mono border transition-all cursor-pointer",
																		maxOutputTokens === val
																			? "bg-foreground text-background border-foreground font-medium"
																			: "bg-background text-muted-foreground hover:text-foreground border-border/60",
																	)}
																>
																	{val >= 1000 ? `${val / 1000}k` : val}
																</button>
															))}
														</div>
													</div>
												</div>

												{/* Temperature */}
												<div className="space-y-1.5 pt-2">
													<div className="flex items-center justify-between">
														<label
															htmlFor={`${providerId}-${model}-temp`}
															className="text-xs font-medium text-foreground"
														>
															{ai.temperatureLabel}
														</label>
														<span className="text-[11px] font-mono text-muted-foreground">
															{temperature}
														</span>
													</div>
													<div className="flex items-center gap-3">
														<input
															id={`${providerId}-${model}-temp`}
															type="range"
															min={0}
															max={2}
															step={0.1}
															value={temperature}
															onChange={(e) =>
																onUpdateCapability(providerId, model, {
																	temperature: Number(e.target.value),
																})
															}
															className="flex-1 accent-foreground cursor-pointer"
														/>
														<Input
															type="number"
															min={0}
															max={2}
															step={0.1}
															value={temperature}
															onChange={(e) =>
																onUpdateCapability(providerId, model, {
																	temperature: Number(e.target.value),
																})
															}
															className="w-16 h-8 text-xs font-mono text-center bg-background"
														/>
													</div>
													<p className="text-[10px] text-muted-foreground">
														{ai.temperatureDesc}
													</p>
												</div>
											</div>
										</div>
									)}
								</div>
							)
						})}
					</div>
				)}
			</div>
		</div>
	)
}
