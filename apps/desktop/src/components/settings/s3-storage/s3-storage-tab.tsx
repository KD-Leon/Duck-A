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
import {
	IconAlertCircle,
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
import { useStore } from "@/store"

const PRESETS: Array<{
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

export function S3StorageTab() {
	const workspacePath = useStore((state) => state.workspacePath)
	const {
		s3SyncState,
		loadS3SyncConfig,
		saveS3SyncConfig,
		testS3Connection,
		performS3Sync,
	} = useStore(
		useShallow((state) => ({
			s3SyncState: state.s3SyncState,
			loadS3SyncConfig: state.loadS3SyncConfig,
			saveS3SyncConfig: state.saveS3SyncConfig,
			testS3Connection: state.testS3Connection,
			performS3Sync: state.performS3Sync,
		})),
	)

	const [config, setConfig] = useState<S3Config>(s3SyncState.config)
	const [showSecret, setShowSecret] = useState(false)
	const [testResult, setTestResult] = useState<{
		success: boolean
		error?: string
	} | null>(null)
	const [syncingMode, setSyncingMode] = useState<string | null>(null)

	useEffect(() => {
		if (workspacePath) {
			void loadS3SyncConfig(workspacePath)
		}
	}, [workspacePath, loadS3SyncConfig])

	useEffect(() => {
		setConfig(s3SyncState.config)
	}, [s3SyncState.config])

	const updateConfigField = async (partial: Partial<S3Config>) => {
		const next = { ...config, ...partial }
		setConfig(next)
		setTestResult(null)
		if (workspacePath) {
			await saveS3SyncConfig(workspacePath, partial)
		}
	}

	const handlePresetChange = (presetId: S3ProviderPreset) => {
		const preset = PRESETS.find((p) => p.id === presetId)
		if (!preset) return

		updateConfigField({
			preset: presetId,
			endpoint: preset.defaultEndpoint || config.endpoint,
			region: preset.defaultRegion || config.region,
			forcePathStyle: preset.forcePathStyle,
		})
	}

	const handleTestConnection = async () => {
		setTestResult(null)
		const res = await testS3Connection(config)
		setTestResult(res)
		if (res.success) {
			toast.success("S3 存储桶连接成功！权限与配置均正常。")
		} else {
			toast.error(res.error || "连接测试失败，请检查配置。")
		}
	}

	const handleSync = async (mode: "bidirectional" | "push" | "pull") => {
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
					<FieldLegend>S3 对象存储与云同步</FieldLegend>
					<FieldDescription>
						请先打开一个工作区以配置 S3 同步与备份。
					</FieldDescription>
				</FieldSet>
			</div>
		)
	}

	return (
		<div className="flex-1 overflow-y-auto p-8 space-y-8">
			{/* Overview & Quick Actions Header */}
			<FieldSet>
				<div className="flex items-start justify-between">
					<div>
						<FieldLegend className="flex items-center gap-2 text-base font-semibold">
							<IconCloud className="size-5 text-purple-500" />
							<span>S3 对象存储与云同步</span>
						</FieldLegend>
						<FieldDescription className="mt-1 text-xs">
							对标 NoteGen S3 架构，全面兼容 AWS S3、Cloudflare
							R2、MinIO、阿里云 OSS、腾讯云 COS 等对象存储。
						</FieldDescription>
					</div>

					{/* Sync Status Badge */}
					<div className="flex items-center gap-2">
						{s3SyncState.lastSyncTime && (
							<span className="text-[11px] text-muted-foreground">
								上次同步:{" "}
								{new Date(s3SyncState.lastSyncTime).toLocaleTimeString()}
							</span>
						)}
					</div>
				</div>

				{/* Action Buttons Toolbar */}
				<div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border/40 mt-3">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={handleTestConnection}
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
						onClick={() => handleSync("bidirectional")}
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
						onClick={() => handleSync("push")}
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
						onClick={() => handleSync("pull")}
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

				{/* Test result feedback banner */}
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

			{/* Configuration Form */}
			<FieldSet>
				<FieldLegend className="text-sm font-semibold">
					服务商与连接配置
				</FieldLegend>
				<FieldGroup className="space-y-3 mt-3">
					{/* Provider Preset */}
					<Field orientation="horizontal">
						<FieldContent>
							<FieldLabel>服务商快捷预设 (Provider)</FieldLabel>
							<FieldDescription>
								选择常见对象存储服务商以自动预填端点与区域格式
							</FieldDescription>
						</FieldContent>
						<Select
							value={config.preset || "custom"}
							onValueChange={(val) =>
								handlePresetChange(val as S3ProviderPreset)
							}
						>
							<SelectTrigger className="w-[240px] text-xs">
								{
									PRESETS.find((p) => p.id === (config.preset || "custom"))
										?.label
								}
							</SelectTrigger>
							<SelectContent>
								{PRESETS.map((p) => (
									<SelectItem key={p.id} value={p.id}>
										{p.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Field>

					{/* Endpoint */}
					<Field orientation="vertical">
						<FieldContent>
							<FieldLabel>服务节点 (Endpoint)</FieldLabel>
							<FieldDescription>
								S3 API 端点 URL（支持带 https:// 前缀）
							</FieldDescription>
						</FieldContent>
						<Input
							value={config.endpoint}
							onChange={(e) => updateConfigField({ endpoint: e.target.value })}
							placeholder="https://s3.us-east-1.amazonaws.com"
							className="text-xs"
						/>
					</Field>

					<div className="grid grid-cols-2 gap-4">
						{/* Bucket Name */}
						<Field orientation="vertical">
							<FieldContent>
								<FieldLabel>存储桶名称 (Bucket)</FieldLabel>
								<FieldDescription>您的远程 S3 存储桶名字</FieldDescription>
							</FieldContent>
							<Input
								value={config.bucket}
								onChange={(e) => updateConfigField({ bucket: e.target.value })}
								placeholder="my-notes-vault"
								className="text-xs"
							/>
						</Field>

						{/* Region */}
						<Field orientation="vertical">
							<FieldContent>
								<FieldLabel>区域代码 (Region)</FieldLabel>
								<FieldDescription>
									如 us-east-1、auto、oss-cn-hangzhou
								</FieldDescription>
							</FieldContent>
							<Input
								value={config.region}
								onChange={(e) => updateConfigField({ region: e.target.value })}
								placeholder="us-east-1"
								className="text-xs"
							/>
						</Field>
					</div>

					<div className="grid grid-cols-2 gap-4">
						{/* Access Key ID */}
						<Field orientation="vertical">
							<FieldContent>
								<FieldLabel>Access Key ID</FieldLabel>
								<FieldDescription>访问密钥 ID</FieldDescription>
							</FieldContent>
							<Input
								value={config.accessKeyId}
								onChange={(e) =>
									updateConfigField({ accessKeyId: e.target.value })
								}
								placeholder="AKIA..."
								className="text-xs font-mono"
							/>
						</Field>

						{/* Secret Access Key */}
						<Field orientation="vertical">
							<FieldContent>
								<FieldLabel>Secret Access Key</FieldLabel>
								<FieldDescription>私有访问秘钥</FieldDescription>
							</FieldContent>
							<div className="relative">
								<Input
									type={showSecret ? "text" : "password"}
									value={config.secretAccessKey}
									onChange={(e) =>
										updateConfigField({ secretAccessKey: e.target.value })
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
						{/* Prefix */}
						<Field orientation="vertical">
							<FieldContent>
								<FieldLabel>路径前缀 (Path Prefix)</FieldLabel>
								<FieldDescription>
									可选，用于在存储桶中隔离子目录
								</FieldDescription>
							</FieldContent>
							<Input
								value={config.prefix}
								onChange={(e) => updateConfigField({ prefix: e.target.value })}
								placeholder="notes/ or mdit/"
								className="text-xs"
							/>
						</Field>

						{/* Public Domain / CDN */}
						<Field orientation="vertical">
							<FieldContent>
								<FieldLabel>公开访问域名 (Public CDN URL)</FieldLabel>
								<FieldDescription>可选，图片/附件公开直链前缀</FieldDescription>
							</FieldContent>
							<Input
								value={config.publicUrl || ""}
								onChange={(e) =>
									updateConfigField({ publicUrl: e.target.value })
								}
								placeholder="https://cdn.example.com"
								className="text-xs"
							/>
						</Field>
					</div>

					{/* Force Path Style */}
					<Field orientation="horizontal">
						<FieldContent>
							<FieldLabel>强制路径样式 (Force Path Style)</FieldLabel>
							<FieldDescription>
								MinIO 或私有云 S3 服务通常需要开启（endpoint/bucket/key 格式）
							</FieldDescription>
						</FieldContent>
						<Switch
							checked={config.forcePathStyle}
							onCheckedChange={(checked) =>
								updateConfigField({ forcePathStyle: checked })
							}
						/>
					</Field>

					{/* Sync Attachments */}
					<Field orientation="horizontal">
						<FieldContent>
							<FieldLabel>同步多媒体附件 (Sync Media & Attachments)</FieldLabel>
							<FieldDescription>
								同步图片、音视频及 PDF 等大文件附件
							</FieldDescription>
						</FieldContent>
						<Switch
							checked={config.syncAttachments}
							onCheckedChange={(checked) =>
								updateConfigField({ syncAttachments: checked })
							}
						/>
					</Field>
				</FieldGroup>
			</FieldSet>
		</div>
	)
}
