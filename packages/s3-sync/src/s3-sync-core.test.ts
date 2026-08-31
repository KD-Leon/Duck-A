import { describe, expect, it, vi } from "vitest"
import { S3Client } from "./s3-client"
import { signS3Request } from "./s3-sigv4"
import { S3SyncCore } from "./s3-sync-core"
import type { S3Config, S3FsPort } from "./types"

const mockConfig: S3Config = {
	endpoint: "https://s3.us-east-1.amazonaws.com",
	region: "us-east-1",
	bucket: "test-bucket",
	accessKeyId: "AKIAIOSFODNN7EXAMPLE",
	secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
	prefix: "notes",
	forcePathStyle: false,
	autoSync: false,
	syncAttachments: true,
}

describe("S3 SigV4 Signer", () => {
	it("generates valid AWS4 authorization header", async () => {
		const headers = await signS3Request({
			method: "GET",
			url: "https://test-bucket.s3.us-east-1.amazonaws.com/test.txt",
			region: "us-east-1",
			accessKeyId: "AKIAIOSFODNN7EXAMPLE",
			secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
		})

		expect(headers.Authorization).toBeDefined()
		expect(headers.Authorization).toContain("AWS4-HMAC-SHA256")
		expect(headers.Authorization).toContain("Credential=AKIAIOSFODNN7EXAMPLE")
		expect(headers["x-amz-date"]).toBeDefined()
		expect(headers["x-amz-content-sha256"]).toBeDefined()
	})
})

describe("S3Client", () => {
	it("handles listObjects XML parsing correctly", async () => {
		const mockXml = `<?xml version="1.0" encoding="UTF-8"?>
<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
    <Name>test-bucket</Name>
    <Prefix>notes</Prefix>
    <Contents>
        <Key>notes/hello.md</Key>
        <LastModified>2026-08-31T12:00:00.000Z</LastModified>
        <ETag>&quot;9badd89322e8f46d509f00a88a7342d6&quot;</ETag>
        <Size>1234</Size>
    </Contents>
</ListBucketResult>`

		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			text: async () => mockXml,
		} as any)

		const client = new S3Client(mockConfig, mockFetch)
		const list = await client.listObjects()

		expect(list).toHaveLength(1)
		expect(list[0].key).toBe("hello.md")
		expect(list[0].size).toBe(1234)
		expect(list[0].etag).toBe("9badd89322e8f46d509f00a88a7342d6")
	})
})

describe("S3SyncCore", () => {
	it("performs bidirectional sync uploading new local files", async () => {
		const mockXml = `<?xml version="1.0" encoding="UTF-8"?>
<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
    <Contents></Contents>
</ListBucketResult>`

		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			text: async () => mockXml,
		} as any)

		const core = new S3SyncCore(mockConfig, mockFetch)

		const mockFsPort: S3FsPort = {
			readTextFile: vi.fn().mockResolvedValue("# Hello World"),
			writeTextFile: vi.fn().mockResolvedValue(undefined),
			readBinaryFile: vi
				.fn()
				.mockResolvedValue(new TextEncoder().encode("# Hello World")),
			writeBinaryFile: vi.fn().mockResolvedValue(undefined),
			deleteFile: vi.fn().mockResolvedValue(undefined),
			listAllFiles: vi.fn().mockResolvedValue([
				{
					relativePath: "doc.md",
					absolutePath: "/workspace/doc.md",
					size: 13,
					modifiedAt: new Date(),
				},
			]),
		}

		const result = await core.syncBidirectional("/workspace", mockFsPort)
		expect(result.success).toBe(true)
		expect(result.uploadedCount).toBe(1)
		expect(result.downloadedCount).toBe(0)
	})
})
