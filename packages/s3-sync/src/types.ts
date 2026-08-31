export type S3ProviderPreset =
	| "custom"
	| "aws"
	| "cloudflare-r2"
	| "minio"
	| "aliyun-oss"
	| "tencent-cos"
	| "qiniu"

export type S3Config = {
	preset?: S3ProviderPreset
	endpoint: string
	region: string
	bucket: string
	accessKeyId: string
	secretAccessKey: string
	prefix: string
	forcePathStyle: boolean
	publicUrl?: string
	autoSync: boolean
	syncAttachments: boolean
}

export type S3SyncStatus = "idle" | "testing" | "syncing" | "synced" | "error"

export type S3ObjectItem = {
	key: string
	size: number
	lastModified: Date
	etag: string
}

export type S3SyncResult = {
	success: boolean
	uploadedCount: number
	downloadedCount: number
	deletedCount: number
	error?: string
}

export type LocalFileItem = {
	relativePath: string
	absolutePath: string
	size: number
	modifiedAt: Date
}

export type S3FsPort = {
	readTextFile: (path: string) => Promise<string>
	writeTextFile: (path: string, content: string) => Promise<void>
	readBinaryFile: (path: string) => Promise<Uint8Array>
	writeBinaryFile: (path: string, data: Uint8Array) => Promise<void>
	deleteFile: (path: string) => Promise<void>
	listAllFiles: (dirPath: string) => Promise<LocalFileItem[]>
}
