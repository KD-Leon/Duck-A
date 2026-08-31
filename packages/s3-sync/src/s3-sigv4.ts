const encoder = new TextEncoder()

async function sha256(data: string | Uint8Array): Promise<string> {
	const buffer: BufferSource =
		typeof data === "string"
			? encoder.encode(data)
			: (data as unknown as BufferSource)
	const hashBuffer = await crypto.subtle.digest("SHA-256", buffer)
	const hashArray = Array.from(new Uint8Array(hashBuffer))
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

async function hmacSha256(
	key: Uint8Array | ArrayBuffer,
	data: string,
): Promise<ArrayBuffer> {
	const keyBuffer: BufferSource = key as unknown as BufferSource
	const cryptoKey = await crypto.subtle.importKey(
		"raw",
		keyBuffer,
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	)
	return await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data))
}

function toHex(buffer: ArrayBuffer): string {
	const array = Array.from(new Uint8Array(buffer))
	return array.map((b) => b.toString(16).padStart(2, "0")).join("")
}

async function getSignatureKey(
	secretKey: string,
	dateStamp: string,
	regionName: string,
	serviceName: string,
): Promise<ArrayBuffer> {
	const kSecret = encoder.encode(`AWS4${secretKey}`)
	const kDate = await hmacSha256(kSecret, dateStamp)
	const kRegion = await hmacSha256(kDate, regionName)
	const kService = await hmacSha256(kRegion, serviceName)
	return await hmacSha256(kService, "aws4_request")
}

export type SignRequestOptions = {
	method: "GET" | "PUT" | "DELETE" | "HEAD" | "POST"
	url: string
	region: string
	accessKeyId: string
	secretAccessKey: string
	headers?: Record<string, string>
	body?: string | Uint8Array
	service?: string
}

export async function signS3Request({
	method,
	url,
	region,
	accessKeyId,
	secretAccessKey,
	headers = {},
	body,
	service = "s3",
}: SignRequestOptions): Promise<Record<string, string>> {
	const parsedUrl = new URL(url)
	const now = new Date()
	const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "")
	const dateStamp = amzDate.slice(0, 8)

	const payloadHash = body
		? await sha256(body)
		: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" // empty string sha256

	const signedHeadersMap: Record<string, string> = {
		host: parsedUrl.host,
		"x-amz-date": amzDate,
		"x-amz-content-sha256": payloadHash,
		...headers,
	}

	const sortedHeaderKeys = Object.keys(signedHeadersMap)
		.map((k) => k.toLowerCase())
		.sort()

	const canonicalHeaders = sortedHeaderKeys
		.map((key) => {
			const originalKey =
				Object.keys(signedHeadersMap).find((k) => k.toLowerCase() === key) ??
				key
			return `${key}:${signedHeadersMap[originalKey].trim()}\n`
		})
		.join("")

	const signedHeadersStr = sortedHeaderKeys.join(";")

	// Canonical Query String
	const searchParams = new URLSearchParams(parsedUrl.search)
	const sortedParams = Array.from(searchParams.entries()).sort(([a], [b]) =>
		a.localeCompare(b),
	)
	const canonicalQueryString = sortedParams
		.map(
			([k, v]) =>
				`${encodeURIComponent(k)}=${encodeURIComponent(v).replace(/\+/g, "%20")}`,
		)
		.join("&")

	// Canonical URI
	const canonicalUri = parsedUrl.pathname || "/"

	const canonicalRequest = [
		method,
		canonicalUri,
		canonicalQueryString,
		canonicalHeaders,
		signedHeadersStr,
		payloadHash,
	].join("\n")

	const hashedCanonicalRequest = await sha256(canonicalRequest)

	const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
	const stringToSign = [
		"AWS4-HMAC-SHA256",
		amzDate,
		credentialScope,
		hashedCanonicalRequest,
	].join("\n")

	const signingKey = await getSignatureKey(
		secretAccessKey,
		dateStamp,
		region,
		service,
	)
	const signature = toHex(await hmacSha256(signingKey, stringToSign))

	const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeadersStr}, Signature=${signature}`

	return {
		...signedHeadersMap,
		Authorization: authorizationHeader,
	}
}
