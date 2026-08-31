import {
	type S3Config,
	type S3FsPort,
	S3SyncCore,
	type S3SyncResult,
	type S3SyncStatus,
} from "@mdit/s3-sync"
import type { StateCreator } from "zustand"
import type { WorkspaceSettings } from "../workspace/workspace-settings"

export type {
	S3Config,
	S3FsPort,
	S3ObjectItem,
	S3ProviderPreset,
	S3SyncResult,
	S3SyncStatus,
} from "@mdit/s3-sync"

export type S3SyncState = {
	config: S3Config
	status: S3SyncStatus
	isConfigured: boolean
	lastSyncTime: number | null
	lastSyncResult: S3SyncResult | null
	error: string | null
	isTesting: boolean
}

export type S3SyncSlice = {
	// State
	s3SyncState: S3SyncState

	// Actions
	loadS3SyncConfig: (workspacePath: string | null) => Promise<void>
	saveS3SyncConfig: (
		workspacePath: string,
		partialConfig: Partial<S3Config>,
	) => Promise<void>
	testS3Connection: (
		configToTest?: S3Config,
	) => Promise<{ success: boolean; error?: string }>
	performS3Sync: (
		mode?: "bidirectional" | "push" | "pull",
	) => Promise<S3SyncResult>
	uploadMediaToS3: (
		fileName: string,
		data: Uint8Array | string,
		contentType?: string,
	) => Promise<string>
}

export type S3SyncSliceDependencies = {
	loadSettings: (workspacePath: string) => Promise<WorkspaceSettings>
	saveSettings: (
		workspacePath: string,
		settings: WorkspaceSettings,
	) => Promise<void>
	fsPort: S3FsPort
	fetchFn?: typeof fetch
}

export const DEFAULT_S3_CONFIG: S3Config = {
	preset: "custom",
	endpoint: "",
	region: "us-east-1",
	bucket: "",
	accessKeyId: "",
	secretAccessKey: "",
	prefix: "",
	forcePathStyle: false,
	publicUrl: "",
	autoSync: false,
	syncAttachments: true,
}

const buildInitialS3SyncState = (): S3SyncState => ({
	config: { ...DEFAULT_S3_CONFIG },
	status: "idle",
	isConfigured: false,
	lastSyncTime: null,
	lastSyncResult: null,
	error: null,
	isTesting: false,
})

export const prepareS3SyncSlice =
	({
		loadSettings,
		saveSettings,
		fsPort,
		fetchFn,
	}: S3SyncSliceDependencies): StateCreator<
		S3SyncSlice & {
			refreshWorkspaceEntries: () => Promise<void>
			workspacePath: string | null
		},
		[],
		[],
		S3SyncSlice
	> =>
	(set, get) => {
		const isConfigValid = (c: S3Config): boolean => {
			return Boolean(
				c.endpoint.trim() &&
					c.bucket.trim() &&
					c.accessKeyId.trim() &&
					c.secretAccessKey.trim(),
			)
		}

		return {
			s3SyncState: buildInitialS3SyncState(),

			loadS3SyncConfig: async (workspacePath: string | null) => {
				if (!workspacePath) {
					set({ s3SyncState: buildInitialS3SyncState() })
					return
				}

				try {
					const settings = await loadSettings(workspacePath)
					const config = settings.s3Sync
						? { ...DEFAULT_S3_CONFIG, ...settings.s3Sync }
						: { ...DEFAULT_S3_CONFIG }

					set((state) => ({
						s3SyncState: {
							...state.s3SyncState,
							config,
							isConfigured: isConfigValid(config),
							error: null,
						},
					}))
				} catch (err: any) {
					set((state) => ({
						s3SyncState: {
							...state.s3SyncState,
							error: err?.message || "加载 S3 配置失败",
						},
					}))
				}
			},

			saveS3SyncConfig: async (
				workspacePath: string,
				partialConfig: Partial<S3Config>,
			) => {
				const current = get().s3SyncState.config
				const merged: S3Config = { ...current, ...partialConfig }
				const settings = await loadSettings(workspacePath)

				await saveSettings(workspacePath, {
					...settings,
					s3Sync: merged,
				})

				set((state) => ({
					s3SyncState: {
						...state.s3SyncState,
						config: merged,
						isConfigured: isConfigValid(merged),
					},
				}))
			},

			testS3Connection: async (configToTest?: S3Config) => {
				const targetConfig = configToTest || get().s3SyncState.config
				if (!isConfigValid(targetConfig)) {
					return {
						success: false,
						error: "请先填写完整的 Endpoint、Bucket、Access Key 和 Secret Key",
					}
				}

				set((state) => ({
					s3SyncState: {
						...state.s3SyncState,
						isTesting: true,
						status: "testing",
						error: null,
					},
				}))

				try {
					const core = new S3SyncCore(targetConfig, fetchFn)
					const result = await core.testConnection()
					set((state) => ({
						s3SyncState: {
							...state.s3SyncState,
							isTesting: false,
							status: result.success ? "idle" : "error",
							error: result.error || null,
						},
					}))
					return result
				} catch (err: any) {
					const errorMsg = err?.message || "连接 S3 失败"
					set((state) => ({
						s3SyncState: {
							...state.s3SyncState,
							isTesting: false,
							status: "error",
							error: errorMsg,
						},
					}))
					return { success: false, error: errorMsg }
				}
			},

			performS3Sync: async (
				mode: "bidirectional" | "push" | "pull" = "bidirectional",
			) => {
				const ws = get().workspacePath
				const cfg = get().s3SyncState.config
				if (!ws || !isConfigValid(cfg)) {
					const error = "未打开工作区或 S3 配置不完整"
					return {
						success: false,
						uploadedCount: 0,
						downloadedCount: 0,
						deletedCount: 0,
						error,
					}
				}

				set((state) => ({
					s3SyncState: {
						...state.s3SyncState,
						status: "syncing",
						error: null,
					},
				}))

				try {
					const core = new S3SyncCore(cfg, fetchFn)
					let result: S3SyncResult

					if (mode === "push") {
						result = await core.pushBackup(ws, fsPort)
					} else if (mode === "pull") {
						result = await core.pullFromRemote(ws, fsPort)
					} else {
						result = await core.syncBidirectional(ws, fsPort)
					}

					await get().refreshWorkspaceEntries()

					set((state) => ({
						s3SyncState: {
							...state.s3SyncState,
							status: result.success ? "synced" : "error",
							lastSyncTime: Date.now(),
							lastSyncResult: result,
							error: result.error || null,
						},
					}))

					return result
				} catch (err: any) {
					const result: S3SyncResult = {
						success: false,
						uploadedCount: 0,
						downloadedCount: 0,
						deletedCount: 0,
						error: err?.message || "S3 同步异常",
					}

					set((state) => ({
						s3SyncState: {
							...state.s3SyncState,
							status: "error",
							lastSyncResult: result,
							error: result.error || null,
						},
					}))

					return result
				}
			},

			uploadMediaToS3: async (
				fileName: string,
				data: Uint8Array | string,
				contentType?: string,
			) => {
				const cfg = get().s3SyncState.config
				if (!isConfigValid(cfg)) {
					throw new Error("S3 配置不完整，无法上传图片")
				}
				const core = new S3SyncCore(cfg, fetchFn)
				return await core.uploadAttachment(fileName, data, contentType)
			},
		}
	}
