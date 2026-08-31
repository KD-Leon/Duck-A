import { signS3Request } from "./s3-sigv4"
import type { S3Config, S3ObjectItem } from "./types"

export class S3Client {
	private config: S3Config
	private fetchFn: typeof fetch

	constructor(config: S3Config, fetchFn: typeof fetch = fetch) {
		this.config = config
		this.fetchFn = fetchFn
	}

	private getBaseUrl(): string {
		let endpoint = this.config.endpoint.trim()
		if (!endpoint.startsWith("http://") && !endpoint.startsWith("https://")) {
			endpoint = `https://${endpoint}`
		}
		endpoint = endpoint.replace(/\/+$/, "")

		const bucket = this.config.bucket.trim()
		if (this.config.forcePathStyle) {
			return `${endpoint}/${bucket}`
		}

		try {
			const url = new URL(endpoint)
			// e.g. https://bucket.s3.us-east-1.amazonaws.com
			if (!url.hostname.startsWith(`${bucket}.`)) {
				url.hostname = `${bucket}.${url.hostname}`
			}
			return url.toString().replace(/\/+$/, "")
		} catch {
			return `${endpoint}/${bucket}`
		}
	}

	private getObjectUrl(key: string): string {
		const baseUrl = this.getBaseUrl()
		const cleanKey = key.startsWith("/") ? key.slice(1) : key
		return `${baseUrl}/${cleanKey.split("/").map(encodeURIComponent).join("/")}`
	}

	async testConnection(): Promise<{ success: boolean; error?: string }> {
		try {
			await this.listObjects("", 1)
			return { success: true }
		} catch (err: any) {
			return {
				success: false,
				error: err?.message || "无法连接到 S3 存储桶，请检查配置与网络。",
			}
		}
	}

	async putObject(
		key: string,
		data: string | Uint8Array,
		contentType = "text/plain; charset=utf-8",
	): Promise<void> {
		const fullKey = this.getFullKey(key)
		const url = this.getObjectUrl(fullKey)
		const body =
			typeof data === "string" ? new TextEncoder().encode(data) : data

		const headers = await signS3Request({
			method: "PUT",
			url,
			region: this.config.region || "us-east-1",
			accessKeyId: this.config.accessKeyId,
			secretAccessKey: this.config.secretAccessKey,
			headers: {
				"content-type": contentType,
			},
			body,
		})

		const res = await this.fetchFn(url, {
			method: "PUT",
			headers,
			body: body as any,
		})

		if (!res.ok) {
			const errorText = await res.text().catch(() => "")
			throw new Error(
				`S3 PutObject 失败 [HTTP ${res.status}]: ${errorText || res.statusText}`,
			)
		}
	}

	async getObject(key: string): Promise<Uint8Array> {
		const fullKey = this.getFullKey(key)
		const url = this.getObjectUrl(fullKey)

		const headers = await signS3Request({
			method: "GET",
			url,
			region: this.config.region || "us-east-1",
			accessKeyId: this.config.accessKeyId,
			secretAccessKey: this.config.secretAccessKey,
		})

		const res = await this.fetchFn(url, {
			method: "GET",
			headers,
		})

		if (!res.ok) {
			throw new Error(
				`S3 GetObject 失败 [HTTP ${res.status}]: ${res.statusText}`,
			)
		}

		const arrayBuffer = await res.arrayBuffer()
		return new Uint8Array(arrayBuffer)
	}

	async deleteObject(key: string): Promise<void> {
		const fullKey = this.getFullKey(key)
		const url = this.getObjectUrl(fullKey)

		const headers = await signS3Request({
			method: "DELETE",
			url,
			region: this.config.region || "us-east-1",
			accessKeyId: this.config.accessKeyId,
			secretAccessKey: this.config.secretAccessKey,
		})

		const res = await this.fetchFn(url, {
			method: "DELETE",
			headers,
		})

		if (!res.ok && res.status !== 404) {
			throw new Error(
				`S3 DeleteObject 失败 [HTTP ${res.status}]: ${res.statusText}`,
			)
		}
	}

	async listObjects(prefix = "", maxKeys = 1000): Promise<S3ObjectItem[]> {
		const baseUrl = this.getBaseUrl()
		const fullPrefix = this.getFullKey(prefix)
		const queryParams = new URLSearchParams({
			"list-type": "2",
			"max-keys": String(maxKeys),
		})
		if (fullPrefix) {
			queryParams.set("prefix", fullPrefix)
		}

		const url = `${baseUrl}?${queryParams.toString()}`

		const headers = await signS3Request({
			method: "GET",
			url,
			region: this.config.region || "us-east-1",
			accessKeyId: this.config.accessKeyId,
			secretAccessKey: this.config.secretAccessKey,
		})

		const res = await this.fetchFn(url, {
			method: "GET",
			headers,
		})

		if (!res.ok) {
			const errorText = await res.text().catch(() => "")
			throw new Error(
				`S3 ListObjects 失败 [HTTP ${res.status}]: ${errorText || res.statusText}`,
			)
		}

		const xmlText = await res.text()
		return this.parseListObjectsXml(xmlText)
	}

	getPublicUrl(key: string): string {
		const fullKey = this.getFullKey(key)
		if (this.config.publicUrl?.trim()) {
			const base = this.config.publicUrl.trim().replace(/\/+$/, "")
			const cleanKey = fullKey.startsWith("/") ? fullKey.slice(1) : fullKey
			return `${base}/${cleanKey}`
		}
		return this.getObjectUrl(fullKey)
	}

	private getFullKey(key: string): string {
		const cleanPrefix = (this.config.prefix || "").replace(/^\/+|\/+$/g, "")
		const cleanKey = key.replace(/^\/+/, "")
		if (!cleanPrefix) return cleanKey
		if (!cleanKey) return cleanPrefix
		return `${cleanPrefix}/${cleanKey}`
	}

	private parseListObjectsXml(xmlText: string): S3ObjectItem[] {
		const items: S3ObjectItem[] = []
		const contentMatches = xmlText.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)
		const rootPrefix = (this.config.prefix || "").replace(/^\/+|\/+$/g, "")

		for (const match of contentMatches) {
			const block = match[1]
			const keyMatch = block.match(/<Key>(.*?)<\/Key>/)
			const sizeMatch = block.match(/<Size>(\d+)<\/Size>/)
			const lastModifiedMatch = block.match(
				/<LastModified>(.*?)<\/LastModified>/,
			)
			const etagMatch = block.match(/<ETag>(.*?)<\/ETag>/)

			if (keyMatch) {
				const fullKey = keyMatch[1]
				// strip rootPrefix if present
				let relativeKey = fullKey
				if (rootPrefix && relativeKey.startsWith(`${rootPrefix}/`)) {
					relativeKey = relativeKey.slice(rootPrefix.length + 1)
				}

				items.push({
					key: relativeKey,
					size: sizeMatch ? Number.parseInt(sizeMatch[1], 10) : 0,
					lastModified: lastModifiedMatch
						? new Date(lastModifiedMatch[1])
						: new Date(),
					etag: etagMatch ? etagMatch[1].replace(/&quot;|"/g, "") : "",
				})
			}
		}

		return items
	}
}
