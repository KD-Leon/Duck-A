import type { S3Config } from "@mdit/s3-sync"

export type WorkspaceSettings = {
	gitSync?: {
		branchName: string
		commitMessage: string
		autoSync: boolean
	}
	s3Sync?: S3Config
	pinnedDirectories?: string[]
	lastOpenedFilePaths?: string[]
	expandedDirectories?: string[]
}
