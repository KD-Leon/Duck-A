import type { LocalFileItem, S3FsPort } from "@mdit/s3-sync"
import {
	readDir,
	readFile,
	readTextFile,
	remove,
	stat,
	writeFile,
	writeTextFile,
} from "@tauri-apps/plugin-fs"

export function createDesktopS3FsPort(): S3FsPort {
	return {
		readTextFile: (path: string) => readTextFile(path),
		writeTextFile: (path: string, content: string) =>
			writeTextFile(path, content),
		readBinaryFile: (path: string) => readFile(path),
		writeBinaryFile: (path: string, data: Uint8Array) => writeFile(path, data),
		deleteFile: (path: string) => remove(path),
		listAllFiles: async (dirPath: string): Promise<LocalFileItem[]> => {
			const results: LocalFileItem[] = []
			const walk = async (currentDir: string, relBase: string) => {
				const entries = await readDir(currentDir)
				for (const entry of entries) {
					if (
						entry.name === ".mdit" ||
						entry.name === ".git" ||
						entry.name.startsWith(".")
					) {
						continue
					}
					const absPath = `${currentDir}/${entry.name}`
					const relPath = relBase ? `${relBase}/${entry.name}` : entry.name
					if (entry.isDirectory) {
						await walk(absPath, relPath)
					} else if (entry.isFile) {
						try {
							const fileStat = await stat(absPath)
							results.push({
								relativePath: relPath,
								absolutePath: absPath,
								size: fileStat.size || 0,
								modifiedAt: fileStat.mtime
									? new Date(fileStat.mtime)
									: new Date(),
							})
						} catch {
							results.push({
								relativePath: relPath,
								absolutePath: absPath,
								size: 0,
								modifiedAt: new Date(),
							})
						}
					}
				}
			}
			await walk(dirPath, "")
			return results
		},
	}
}
