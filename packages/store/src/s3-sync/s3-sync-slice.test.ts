import { describe, expect, it, vi } from "vitest"
import { createStore } from "zustand/vanilla"
import {
	DEFAULT_S3_CONFIG,
	prepareS3SyncSlice,
	type S3SyncSlice,
} from "./s3-sync-slice"

type S3TestState = S3SyncSlice & {
	refreshWorkspaceEntries: () => Promise<void>
	workspacePath: string | null
}

describe("s3-sync-slice", () => {
	it("initializes with default config and loads workspace settings", async () => {
		const mockSettings = {
			s3Sync: {
				...DEFAULT_S3_CONFIG,
				bucket: "my-bucket",
				endpoint: "https://s3.amazonaws.com",
				accessKeyId: "key1",
				secretAccessKey: "sec1",
			},
		}

		const loadSettings = vi.fn().mockResolvedValue(mockSettings)
		const saveSettings = vi.fn().mockResolvedValue(undefined)
		const fsPort = {
			readTextFile: vi.fn(),
			writeTextFile: vi.fn(),
			readBinaryFile: vi.fn(),
			writeBinaryFile: vi.fn(),
			deleteFile: vi.fn(),
			listAllFiles: vi.fn().mockResolvedValue([]),
		}

		const store = createStore<S3TestState>()((set, get, api) => ({
			workspacePath: "/workspace",
			refreshWorkspaceEntries: vi.fn().mockResolvedValue(undefined),
			...prepareS3SyncSlice({
				loadSettings,
				saveSettings,
				fsPort,
			})(set, get, api),
		}))

		expect(store.getState().s3SyncState.isConfigured).toBe(false)

		await store.getState().loadS3SyncConfig("/workspace")

		expect(loadSettings).toHaveBeenCalledWith("/workspace")
		expect(store.getState().s3SyncState.config.bucket).toBe("my-bucket")
		expect(store.getState().s3SyncState.isConfigured).toBe(true)
	})

	it("saves updated s3 config to workspace settings", async () => {
		let storedSettings: any = {}
		const loadSettings = vi.fn().mockImplementation(async () => storedSettings)
		const saveSettings = vi.fn().mockImplementation(async (_, s) => {
			storedSettings = s
		})
		const fsPort = {
			readTextFile: vi.fn(),
			writeTextFile: vi.fn(),
			readBinaryFile: vi.fn(),
			writeBinaryFile: vi.fn(),
			deleteFile: vi.fn(),
			listAllFiles: vi.fn().mockResolvedValue([]),
		}

		const store = createStore<S3TestState>()((set, get, api) => ({
			workspacePath: "/workspace",
			refreshWorkspaceEntries: vi.fn().mockResolvedValue(undefined),
			...prepareS3SyncSlice({
				loadSettings,
				saveSettings,
				fsPort,
			})(set, get, api),
		}))

		await store.getState().saveS3SyncConfig("/workspace", {
			bucket: "new-vault",
			endpoint: "https://r2.cloudflarestorage.com",
			accessKeyId: "id",
			secretAccessKey: "sec",
		})

		expect(saveSettings).toHaveBeenCalled()
		expect(store.getState().s3SyncState.config.bucket).toBe("new-vault")
		expect(store.getState().s3SyncState.isConfigured).toBe(true)
	})
})
