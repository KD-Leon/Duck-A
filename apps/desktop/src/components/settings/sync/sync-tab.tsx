import type { S3Config, S3ProviderPreset } from "@mdit/s3-sync"
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
import { Input } from "@mdit/ui/components/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@mdit/ui/components/select"
import { Switch } from "@mdit/ui/components/switch"
import { Textarea } from "@mdit/ui/components/textarea"
import { cn } from "@mdit/ui/lib/utils"
import {
	IconAlertCircle,
	IconBrandGit,
	IconCheck,
	IconCloud,
	IconCloudDownload,
	IconCloudUpload,
	IconEye,
	IconEyeOff,
	IconLoader2,
	IconPlugConnected,
	IconRefresh,
} from "@tabler/icons-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { useShallow } from "zustand/shallow"
import { useTranslation } from "@/i18n"
import { useStore } from "@/store"

const S3_PRESETS: Array<{
	id: S3ProviderPreset
	label: string
	defaultEndpoint: string
	defaultRegion: string
	forcePathStyle: boolean
}> = [
	{
		id: "custom",
		label: "自定义 S3 服务 (Custom S3)",
		defaultEndpoint: "",
		defaultRegion: "us-east-1",
		forcePathStyle: false,
	},
	{
		id: "aws",
		label: "AWS S3",
		defaultEndpoint: "https://s3.us-east-1.amazonaws.com",
		defaultRegion: "us-east-1",
		forcePathStyle: false,
	},
	{
		id: "cloudflare-r2",
		label: "Cloudflare R2",
		defaultEndpoint: "https://<account-id>.r2.cloudflarestorage.com",
		defaultRegion: "auto",
		forcePathStyle: false,
	},
	{
		id: "minio",
		label: "MinIO / 本地对象存储",
		defaultEndpoint: "http://127.0.0.1:9000",
		defaultRegion: "us-east-1",
		forcePathStyle: true,
	},
	{
		id: "aliyun-oss",
		label: "阿里云 OSS (Alibaba Cloud)",
		defaultEndpoint: "https://oss-cn-hangzhou.aliyuncs.com",
		defaultRegion: "oss-cn-hangzhou",
		forcePathStyle: false,
	},
	{
		id: "tencent-cos",
		label: "腾讯云 COS (Tencent Cloud)",
		defaultEndpoint: "https://cos.ap-guangzhou.myqcloud.com",
		defaultRegion: "ap-guangzhou",
		forcePathStyle: false,
	},
	{
		id: "qiniu",
		label: "七牛云 Kodo (Qiniu Cloud)",
		defaultEndpoint: "https://s3-cn-east-1.qiniucs.com",
		defaultRegion: "cn-east-1",
		forcePathStyle: false,
	},
]

type SyncSubTab = "s3" | "git"

export function SyncTab() {
	const { t } = useTranslation()
	const s = t.settings.sync
	const [activeSubTab, setActiveSubTab] = useState<SyncSubTab>("s3")

	const workspacePath = useStore((state) => state.workspacePath)
	const {
		getSyncConfig,
		setBranchName,
		setCommitMessage,
		setAutoSync,
		s3SyncState,
		loadS3SyncConfig,
		saveS3SyncConfig,
		testS3Connection,
		performS3Sync,
	} = useStore(
		useShallow((state) => ({
			getSyncConfig: state.getSyncConfig,
			setBranchName: state.setBranchName,
			setCommitMessage: state.setCommitMessage,
			setAutoSync: state.setAutoSync,
			s3SyncState: state.s3SyncState,
			loadS3SyncConfig: state.loadS3SyncConfig,
			saveS3SyncConfig: state.saveS3SyncConfig,
			testS3Connection: state.testS3Connection,
			performS3Sync: state.performS3Sync,
		})),
	)

	// Git local states
	const [branchName, setBranchNameLocal] = useState("")
	const [commitMessage, setCommitMessageLocal] = useState("")
	const [autoSync, setAutoSyncLocal] = useState(false)

	// S3 local states
	const [s3Config, setS3Config] = useState<S3Config>(s3SyncState.config)
	const [showSecret, setShowSecret] = useState(false)
	const [testResult, setTestResult] = useState<{
		success: boolean
		error?: string
	} | null>(null)
	const [syncingMode, setSyncingMode] = useState<string | null>(null)

	// Load Git config
	useEffect(() => {
		if (workspacePath) {
			getSyncConfig(workspacePath).then((currentConfig) => {
				setBranchNameLocal(currentConfig.branchName)
				setCommitMessageLocal(currentConfig.commitMessage)
				setAutoSyncLocal(currentConfig.autoSync)
			})
		} else {
			setBranchNameLocal("")
			setCommitMessageLocal("")
			setAutoSyncLocal(false)
		}
	}, [workspacePath, getSyncConfig])

	// Load S3 config
	useEffect(() => {
		if (workspacePath) {
			void loadS3SyncConfig(workspacePath)
		}
	}, [workspacePath, loadS3SyncConfig])

	useEffect(() => {
		setS3Config(s3SyncState.config)
	}, [s3SyncState.config])

	// Git handlers
	const handleBranchNameChange = async (value: string) => {
		setBranchNameLocal(value)
		if (workspacePath) {
			await setBranchName(workspacePath, value)
		}
	}

	const handleCommitMessageChange = async (value: string) => {
		setCommitMessageLocal(value)
		if (workspacePath) {
			await setCommitMessage(workspacePath, value)
		}
	}

	const handleAutoSyncChange = async (checked: boolean) => {
		setAutoSyncLocal(checked)
		if (workspacePath) {
			await setAutoSync(workspacePath, checked)
		}
	}

	// S3 handlers
	const updateS3ConfigField = async (partial: Partial<S3Config>) => {
		const next = { ...s3Config, ...partial }
		setS3Config(next)
		setTestResult(null)
		if (workspacePath) {
			await saveS3SyncConfig(workspacePath, partial)
		}
	}

	const handleS3PresetChange = (presetId: S3ProviderPreset) => {
		const preset = S3_PRESETS.find((p) => p.id === presetId)
		if (!preset) return

		updateS3ConfigField({
			preset: presetId,
			endpoint: preset.defaultEndpoint || s3Config.endpoint,
			region: preset.defaultRegion || s3Config.region,
			forcePathStyle: preset.forcePathStyle,
		})
	}

	const handleTestS3Connection = async () => {
		setTestResult(null)
		const res = await testS3Connection(s3Config)
		setTestResult(res)
		if (res.success) {
			toast.success("S3 存储桶连接成功！权限与配置均正常。")
		} else {
			toast.error(res.error || "连接测试失败，请检查配置。")
		}
	}

	const handleTriggerS3Sync = async (
		mode: "bidirectional" | "push" | "pull",
	) => {
		setSyncingMode(mode)
		try {
			const res = await performS3Sync(mode)
			if (res.success) {
				toast.success(
					`S3 同步完成！上传: ${res.uploadedCount} 篇，下载: ${res.downloadedCount} 篇`,
				)
			} else {
				toast.error(res.error || "S3 同步遇到错误")
			}
		} finally {
			setSyncingMode(null)
		}
	}

	if (!workspacePath) {
		return (
			<div className="flex-1 overflow-y-auto p-12">
				<FieldSet>
					<FieldLegend>同步与备份</FieldLegend>
					<FieldDescription>{s.noWorkspace}</FieldDescription>
				</FieldSet>
			</div>
		)
	}

	return (
		<div className="flex-1 overflow-y-auto p-8 space-y-6">
			{/* Top Segmented SubTab Switcher */}
			<div className="flex items-center justify-between pb-2 border-b border-border/50">
				<div>
					<h2 className="text-base font-semibold">数据同步与云备份</h2>
					<p className="text-xs text-muted-foreground mt-0.5">
						支持 S3 兼容对象存储实时双向同步，以及 Git 代码/笔记版本库备份
					</p>
				</div>
				<div className="inline-flex rounded-lg bg-muted p-0.5 border border-border/40">
					<button
						type="button"
						onClick={() => setActiveSubTab("s3")}
						className={cn(
							"flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all",
							activeSubTab === "s3"
								? "bg-background text-foreground shadow-xs"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						<IconCloud className="size-3.5 text-purple-500" />
						<span>S3 对象存储</span>
					</button>
					<button
						type="button"
						onClick={() => setActiveSubTab("git")}
						className={cn(
							"flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all",
							activeSubTab === "git"
								? "bg-background text-foreground shadow-xs"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						<IconBrandGit className="size-3.5 text-orange-500" />
						<span>Git 版本同步</span>
					</button>
				</div>
			</div>

			{/* S3 Storage View */}
			{activeSubTab === "s3" && (
				<div className="space-y-6">
					<FieldSet>
						<div className="flex items-center justify-between">
							<FieldLegend className="flex items-center gap-2 text-sm font-semibold">
								<IconCloud className="size-4 text-purple-500" />
								<span>S3 跨端同步与控制台</span>
							</FieldLegend>
							{s3SyncState.lastSyncTime && (
								<span className="text-[11px] text-muted-foreground">
									上次同步:{" "}
									{new Date(s3SyncState.lastSyncTime).toLocaleTimeString()}
								</span>
							)}
						</div>

						{/* Action Buttons Toolbar */}
						<div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40 mt-2">
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={handleTestS3Connection}
								disabled={s3SyncState.isTesting}
								className="h-8 text-xs gap-1.5"
							>
								{s3SyncState.isTesting ? (
									<IconLoader2 className="size-3.5 animate-spin text-purple-500" />
								) : (
									<IconPlugConnected className="size-3.5 text-purple-500" />
								)}
								<span>测试连接</span>
							</Button>

							<Button
								type="button"
								variant="default"
								size="sm"
								onClick={() => handleTriggerS3Sync("bidirectional")}
								disabled={!s3SyncState.isConfigured || syncingMode !== null}
								className="h-8 text-xs gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
							>
								{syncingMode === "bidirectional" ? (
									<IconLoader2 className="size-3.5 animate-spin" />
								) : (
									<IconRefresh className="size-3.5" />
								)}
								<span>立即双向同步</span>
							</Button>

							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => handleTriggerS3Sync("push")}
								disabled={!s3SyncState.isConfigured || syncingMode !== null}
								className="h-8 text-xs gap-1.5"
							>
								{syncingMode === "push" ? (
									<IconLoader2 className="size-3.5 animate-spin text-blue-500" />
								) : (
									<IconCloudUpload className="size-3.5 text-blue-500" />
								)}
								<span>备份到 S3</span>
							</Button>

							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => handleTriggerS3Sync("pull")}
								disabled={!s3SyncState.isConfigured || syncingMode !== null}
								className="h-8 text-xs gap-1.5"
							>
								{syncingMode === "pull" ? (
									<IconLoader2 className="size-3.5 animate-spin text-amber-500" />
								) : (
									<IconCloudDownload className="size-3.5 text-amber-500" />
								)}
								<span>从 S3 拉取</span>
							</Button>
						</div>

						{/* Feedback Banner */}
						{testResult && (
							<div
								className={`mt-3 p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
									testResult.success
										? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
										: "bg-destructive/10 border-destructive/30 text-destructive"
								}`}
							>
								{testResult.success ? (
									<IconCheck className="size-4 shrink-0" />
								) : (
									<IconAlertCircle className="size-4 shrink-0" />
								)}
								<span>
									{testResult.success
										? "S3 连通性测试通过！存储桶与凭证有效。"
										: `连接失败: ${testResult.error}`}
								</span>
							</div>
						)}
					</FieldSet>

					{/* Form */}
					<FieldSet>
						<FieldLegend className="text-sm font-semibold">
							服务商与连接凭据
						</FieldLegend>
						<FieldGroup className="space-y-3 mt-3">
							<Field orientation="horizontal">
								<FieldContent>
									<FieldLabel>服务商快捷预设 (Provider)</FieldLabel>
									<FieldDescription>
										选择常见对象存储服务商以自动预填端点与区域格式
									</FieldDescription>
								</FieldContent>
								<Select
									value={s3Config.preset || "custom"}
									onValueChange={(val) =>
										handleS3PresetChange(val as S3ProviderPreset)
									}
								>
									<SelectTrigger className="w-[240px] text-xs">
										{
											S3_PRESETS.find(
												(p) => p.id === (s3Config.preset || "custom"),
											)?.label
										}
									</SelectTrigger>
									<SelectContent>
										{S3_PRESETS.map((p) => (
											<SelectItem key={p.id} value={p.id}>
												{p.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</Field>

							<Field orientation="vertical">
								<FieldContent>
									<FieldLabel>服务节点 (Endpoint)</FieldLabel>
									<FieldDescription>
										S3 API 端点 URL（支持带 https:// 前缀）
									</FieldDescription>
								</FieldContent>
								<Input
									value={s3Config.endpoint}
									onChange={(e) =>
										updateS3ConfigField({ endpoint: e.target.value })
									}
									placeholder="https://s3.us-east-1.amazonaws.com"
									className="text-xs"
								/>
							</Field>

							<div className="grid grid-cols-2 gap-4">
								<Field orientation="vertical">
									<FieldContent>
										<FieldLabel>存储桶名称 (Bucket)</FieldLabel>
										<FieldDescription>您的远程 S3 存储桶名字</FieldDescription>
									</FieldContent>
									<Input
										value={s3Config.bucket}
										onChange={(e) =>
											updateS3ConfigField({ bucket: e.target.value })
										}
										placeholder="my-notes-vault"
										className="text-xs"
									/>
								</Field>

								<Field orientation="vertical">
									<FieldContent>
										<FieldLabel>区域代码 (Region)</FieldLabel>
										<FieldDescription>
											如 us-east-1、auto、oss-cn-hangzhou
										</FieldDescription>
									</FieldContent>
									<Input
										value={s3Config.region}
										onChange={(e) =>
											updateS3ConfigField({ region: e.target.value })
										}
										placeholder="us-east-1"
										className="text-xs"
									/>
								</Field>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<Field orientation="vertical">
									<FieldContent>
										<FieldLabel>Access Key ID</FieldLabel>
										<FieldDescription>访问密钥 ID</FieldDescription>
									</FieldContent>
									<Input
										value={s3Config.accessKeyId}
										onChange={(e) =>
											updateS3ConfigField({ accessKeyId: e.target.value })
										}
										placeholder="AKIA..."
										className="text-xs font-mono"
									/>
								</Field>

								<Field orientation="vertical">
									<FieldContent>
										<FieldLabel>Secret Access Key</FieldLabel>
										<FieldDescription>私有访问秘钥</FieldDescription>
									</FieldContent>
									<div className="relative">
										<Input
											type={showSecret ? "text" : "password"}
											value={s3Config.secretAccessKey}
											onChange={(e) =>
												updateS3ConfigField({
													secretAccessKey: e.target.value,
												})
											}
											placeholder="Secret Access Key"
											className="text-xs font-mono pr-8"
										/>
										<button
											type="button"
											onClick={() => setShowSecret((p) => !p)}
											className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
										>
											{showSecret ? (
												<IconEyeOff className="size-3.5" />
											) : (
												<IconEye className="size-3.5" />
											)}
										</button>
									</div>
								</Field>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<Field orientation="vertical">
									<FieldContent>
										<FieldLabel>路径前缀 (Path Prefix)</FieldLabel>
										<FieldDescription>
											可选，用于在存储桶中隔离子目录
										</FieldDescription>
									</FieldContent>
									<Input
										value={s3Config.prefix}
										onChange={(e) =>
											updateS3ConfigField({ prefix: e.target.value })
										}
										placeholder="notes/ or mdit/"
										className="text-xs"
									/>
								</Field>

								<Field orientation="vertical">
									<FieldContent>
										<FieldLabel>公开访问域名 (Public CDN URL)</FieldLabel>
										<FieldDescription>
											可选，图片/附件公开直链前缀
										</FieldDescription>
									</FieldContent>
									<Input
										value={s3Config.publicUrl || ""}
										onChange={(e) =>
											updateS3ConfigField({ publicUrl: e.target.value })
										}
										placeholder="https://cdn.example.com"
										className="text-xs"
									/>
								</Field>
							</div>

							<Field orientation="horizontal">
								<FieldContent>
									<FieldLabel>强制路径样式 (Force Path Style)</FieldLabel>
									<FieldDescription>
										MinIO 或私有云 S3 服务通常需要开启（endpoint/bucket/key
										格式）
									</FieldDescription>
								</FieldContent>
								<Switch
									checked={s3Config.forcePathStyle}
									onCheckedChange={(checked) =>
										updateS3ConfigField({ forcePathStyle: checked })
									}
								/>
							</Field>

							<Field orientation="horizontal">
								<FieldContent>
									<FieldLabel>
										同步多媒体附件 (Sync Media & Attachments)
									</FieldLabel>
									<FieldDescription>
										同步图片、音视频及 PDF 等大文件附件
									</FieldDescription>
								</FieldContent>
								<Switch
									checked={s3Config.syncAttachments}
									onCheckedChange={(checked) =>
										updateS3ConfigField({ syncAttachments: checked })
									}
								/>
							</Field>
						</FieldGroup>
					</FieldSet>
				</div>
			)}

			{/* Git Sync View */}
			{activeSubTab === "git" && (
				<FieldSet>
					<FieldLegend className="flex items-center gap-2 text-sm font-semibold">
						<IconBrandGit className="size-4 text-orange-500" />
						<span>{s.title}</span>
					</FieldLegend>
					<FieldDescription>{s.description}</FieldDescription>
					<FieldGroup className="space-y-4 mt-3">
						<Field orientation="horizontal">
							<FieldContent>
								<FieldLabel>{s.autoSync}</FieldLabel>
								<FieldDescription>{s.autoSyncDesc}</FieldDescription>
							</FieldContent>
							<Switch
								checked={autoSync}
								onCheckedChange={handleAutoSyncChange}
							/>
						</Field>

						<Field orientation="vertical">
							<FieldContent>
								<FieldLabel>{s.branchName}</FieldLabel>
								<FieldDescription>{s.branchNameDesc}</FieldDescription>
							</FieldContent>
							<Input
								value={branchName}
								onChange={(e) => handleBranchNameChange(e.target.value)}
								placeholder={s.branchPlaceholder}
								className="text-xs"
							/>
						</Field>

						<Field orientation="vertical">
							<FieldContent>
								<FieldLabel>{s.commitMessage}</FieldLabel>
								<FieldDescription>{s.commitMessageDesc}</FieldDescription>
							</FieldContent>
							<Textarea
								value={commitMessage}
								onChange={(e) => handleCommitMessageChange(e.target.value)}
								placeholder={s.commitMessagePlaceholder}
								rows={4}
								className="px-2 py-1.5 text-xs"
							/>
						</Field>
					</FieldGroup>
				</FieldSet>
			)}
		</div>
	)
}
