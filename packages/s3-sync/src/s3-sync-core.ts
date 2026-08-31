import { S3Client } from "./s3-client"
import type { S3Config, S3FsPort, S3SyncResult } from "./types"

export class S3SyncCore {
	private client: S3Client
	private config: S3Config

	constructor(config: S3Config, fetchFn: typeof fetch = fetch) {
		this.config = config
		this.client = new S3Client(config, fetchFn)
	}

	async testConnection(): Promise<{ success: boolean; error?: string }> {
		return await this.client.testConnection()
	}

	async syncBidirectional(
		workspacePath: string,
		fsPort: S3FsPort,
	): Promise<S3SyncResult> {
		let uploadedCount = 0
		let downloadedCount = 0
		const deletedCount = 0

		try {
			const localFiles = await fsPort.listAllFiles(workspacePath)
			const remoteObjects = await this.client.listObjects("")

			const localMap = new Map(localFiles.map((f) => [f.relativePath, f]))
			const remoteMap = new Map(remoteObjects.map((o) => [o.key, o]))

			// 1. Process local files -> check if need upload
			for (const [relPath, localFile] of localMap.entries()) {
				// filter out attachments if disabled
				if (!this.config.syncAttachments && this.isAttachment(relPath)) {
					continue
				}
				// ignore internal .mdit / .git
				if (relPath.startsWith(".mdit/") || relPath.startsWith(".git/")) {
					continue
				}

				const remoteObj = remoteMap.get(relPath)
				if (!remoteObj) {
					// Only exists locally -> upload
					const data = await fsPort.readBinaryFile(localFile.absolutePath)
					await this.client.putObject(
						relPath,
						data,
						this.getContentType(relPath),
					)
					uploadedCount++
				} else {
					// Both exist -> compare modified times
					const localTime = localFile.modifiedAt.getTime()
					const remoteTime = remoteObj.lastModified.getTime()

					// Allow 2 seconds clock tolerance
					if (localTime > remoteTime + 2000) {
						const data = await fsPort.readBinaryFile(localFile.absolutePath)
						await this.client.putObject(
							relPath,
							data,
							this.getContentType(relPath),
						)
						uploadedCount++
					} else if (remoteTime > localTime + 2000) {
						const remoteData = await this.client.getObject(relPath)
						await fsPort.writeBinaryFile(localFile.absolutePath, remoteData)
						downloadedCount++
					}
				}
			}

			// 2. Process remote files not present locally -> download
			for (const [key] of remoteMap.entries()) {
				if (!this.config.syncAttachments && this.isAttachment(key)) {
					continue
				}
				if (key.startsWith(".mdit/") || key.startsWith(".git/")) {
					continue
				}

				if (!localMap.has(key)) {
					const localAbsPath = `${workspacePath}/${key}`
					const remoteData = await this.client.getObject(key)
					await fsPort.writeBinaryFile(localAbsPath, remoteData)
					downloadedCount++
				}
			}

			return {
				success: true,
				uploadedCount,
				downloadedCount,
				deletedCount,
			}
		} catch (err: any) {
			return {
				success: false,
				uploadedCount,
				downloadedCount,
				deletedCount,
				error: err?.message || "S3 同步失败",
			}
		}
	}

	async pushBackup(
		workspacePath: string,
		fsPort: S3FsPort,
	): Promise<S3SyncResult> {
		let uploadedCount = 0

		try {
			const localFiles = await fsPort.listAllFiles(workspacePath)
			for (const localFile of localFiles) {
				const relPath = localFile.relativePath
				if (!this.config.syncAttachments && this.isAttachment(relPath)) {
					continue
				}
				if (relPath.startsWith(".mdit/") || relPath.startsWith(".git/")) {
					continue
				}

				const data = await fsPort.readBinaryFile(localFile.absolutePath)
				await this.client.putObject(relPath, data, this.getContentType(relPath))
				uploadedCount++
			}

			return {
				success: true,
				uploadedCount,
				downloadedCount: 0,
				deletedCount: 0,
			}
		} catch (err: any) {
			return {
				success: false,
				uploadedCount,
				downloadedCount: 0,
				deletedCount: 0,
				error: err?.message || "S3 备份推送失败",
			}
		}
	}

	async pullFromRemote(
		workspacePath: string,
		fsPort: S3FsPort,
	): Promise<S3SyncResult> {
		let downloadedCount = 0

		try {
			const remoteObjects = await this.client.listObjects("")
			for (const remoteObj of remoteObjects) {
				const key = remoteObj.key
				if (!this.config.syncAttachments && this.isAttachment(key)) {
					continue
				}
				if (key.startsWith(".mdit/") || key.startsWith(".git/")) {
					continue
				}

				const localAbsPath = `${workspacePath}/${key}`
				const remoteData = await this.client.getObject(key)
				await fsPort.writeBinaryFile(localAbsPath, remoteData)
				downloadedCount++
			}

			return {
				success: true,
				uploadedCount: 0,
				downloadedCount,
				deletedCount: 0,
			}
		} catch (err: any) {
			return {
				success: false,
				uploadedCount: 0,
				downloadedCount,
				deletedCount: 0,
				error: err?.message || "S3 云端拉取失败",
			}
		}
	}

	async uploadAttachment(
		fileName: string,
		data: Uint8Array | string,
		contentType?: string,
	): Promise<string> {
		const type = contentType || this.getContentType(fileName)
		const targetKey = `attachments/${Date.now()}-${fileName}`
		await this.client.putObject(targetKey, data, type)
		return this.client.getPublicUrl(targetKey)
	}

	private isAttachment(path: string): boolean {
		const ext = path.split(".").pop()?.toLowerCase() || ""
		return [
			"png",
			"jpg",
			"jpeg",
			"gif",
			"webp",
			"svg",
			"mp4",
			"mp3",
			"pdf",
			"zip",
		].includes(ext)
	}

	private getContentType(path: string): string {
		const ext = path.split(".").pop()?.toLowerCase() || ""
		switch (ext) {
			case "md":
			case "markdown":
				return "text/markdown; charset=utf-8"
			case "txt":
				return "text/plain; charset=utf-8"
			case "json":
				return "application/json; charset=utf-8"
			case "png":
				return "image/png"
			case "jpg":
			case "jpeg":
				return "image/jpeg"
			case "gif":
				return "image/gif"
			case "webp":
				return "image/webp"
			case "svg":
				return "image/svg+xml"
			case "pdf":
				return "application/pdf"
			default:
				return "application/octet-stream"
		}
	}
}
