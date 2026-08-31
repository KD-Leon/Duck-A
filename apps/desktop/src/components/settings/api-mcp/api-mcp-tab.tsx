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
import { Switch } from "@mdit/ui/components/switch"
import { Check, Copy } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { useShallow } from "zustand/shallow"
import { useTranslation } from "@/i18n"
import { setLocalApiAuthToken } from "@/lib/local-api"
import {
	ensureLocalApiAuthToken,
	rotateLocalApiAuthToken,
} from "@/lib/local-api-auth"
import { useStore } from "@/store"
import { getLocalApiToggleState } from "./api-mcp-state"

const REST_APIS = [
	{
		method: "GET",
		path: "/healthz",
		description: "Health check",
	},
	{
		method: "GET",
		path: "/api/v1/vaults",
		description: "List vaults",
	},
	{
		method: "POST",
		path: "/api/v1/vaults/{vault_id}/notes",
		description: "Create markdown note",
	},
	{
		method: "POST",
		path: "/api/v1/vaults/{vault_id}/search",
		description: "Search notes",
	},
] as const

const MCP_TOOLS = [
	{
		name: "list_vaults",
		description: "List available vaults",
	},
	{
		name: "create_note",
		description: "Create a markdown note",
	},
	{
		name: "search_notes",
		description: "Search markdown notes",
	},
] as const

const CLIENT_GUIDES = [
	{
		name: "Claude Code",
		description: "Add an MCP server using the Claude Code CLI.",
		snippet:
			'claude mcp add --transport http mdit "http://127.0.0.1:39123/mcp?token=<TOKEN>"',
	},
	{
		name: "Codex",
		description: "Register the MCP server with Codex CLI (or use config.toml).",
		snippet: `# CLI
codex mcp add mdit --url "http://127.0.0.1:39123/mcp?token=<TOKEN>"

# ~/.codex/config.toml
[mcp_servers.mdit]
url = "http://127.0.0.1:39123/mcp?token=<TOKEN>"`,
	},
	{
		name: "Cursor",
		description: "Add this server to Cursor MCP settings JSON.",
		snippet: `{
  "mcpServers": {
    "mdit": {
      "url": "http://127.0.0.1:39123/mcp?token=<TOKEN>"
    }
  }
}`,
	},
] as const

export function ApiMcpTab() {
	const { t } = useTranslation()
	const mcp = t.settings.apiMcp

	const {
		localApiEnabled,
		setLocalApiEnabled,
		localApiError,
		setLocalApiError,
	} = useStore(
		useShallow((state) => ({
			localApiEnabled: state.localApiEnabled,
			setLocalApiEnabled: state.setLocalApiEnabled,
			localApiError: state.localApiError,
			setLocalApiError: state.setLocalApiError,
		})),
	)
	const [token, setToken] = useState("")
	const [tokenCopied, setTokenCopied] = useState(false)

	useEffect(() => {
		let isActive = true

		const loadToken = async () => {
			try {
				const ensuredToken = await ensureLocalApiAuthToken()
				if (!isActive) {
					return
				}
				setToken(ensuredToken)
				await setLocalApiAuthToken(ensuredToken)
			} catch (error) {
				const message =
					error instanceof Error ? error.message : String(error ?? "Unknown")
				toast.error("Failed to load local API auth token")
				console.error("Failed to initialize local API auth token:", error)
				if (isActive) {
					setLocalApiError(`Failed to load local API auth token: ${message}`)
				}
			}
		}

		void loadToken()

		return () => {
			isActive = false
		}
	}, [setLocalApiError])

	const handleCopyToken = async () => {
		if (!token) return
		try {
			await navigator.clipboard.writeText(token)
			setTokenCopied(true)
			setTimeout(() => setTokenCopied(false), 2000)
		} catch (error) {
			console.error("Clipboard write failed:", error)
			toast.error(t.common.failedToCopy)
		}
	}

	const copyToClipboard = async (value: string, successMessage: string) => {
		try {
			await navigator.clipboard.writeText(value)
			toast.success(successMessage)
		} catch (error) {
			console.error("Clipboard write failed:", error)
			toast.error(t.common.failedToCopy)
		}
	}

	const handleRotateToken = async () => {
		try {
			const rotatedToken = await rotateLocalApiAuthToken()
			await setLocalApiAuthToken(rotatedToken)
			setToken(rotatedToken)
		} catch (error) {
			const message =
				error instanceof Error ? error.message : String(error ?? "Unknown")
			toast.error("Failed to rotate local API token")
			setLocalApiError(`Failed to rotate local API auth token: ${message}`)
		}
	}

	const toggleState = getLocalApiToggleState(localApiEnabled)

	return (
		<div className="flex-1 overflow-y-auto px-12 pt-12 pb-24 select-text **:select-text [&_button]:select-none **:[[role=switch]]:select-none">
			<FieldSet className="border-b pb-8">
				<FieldLegend>{mcp.title}</FieldLegend>
				<FieldDescription>{mcp.description}</FieldDescription>
				<FieldGroup>
					<Field orientation="horizontal">
						<FieldContent>
							<FieldLabel>{mcp.serverToggle}</FieldLabel>
							<FieldDescription>{toggleState.description}</FieldDescription>
							{localApiError && (
								<p className="mt-2 text-sm text-destructive">{localApiError}</p>
							)}
						</FieldContent>
						<Switch
							checked={toggleState.checked}
							onCheckedChange={setLocalApiEnabled}
							disabled={toggleState.disabled}
						/>
					</Field>
				</FieldGroup>
			</FieldSet>

			<FieldSet className="mt-8 border-b pb-8">
				<FieldLegend>{mcp.authToken}</FieldLegend>
				<FieldDescription>{mcp.authTokenDesc}</FieldDescription>
				<FieldGroup>
					<Field orientation="vertical">
						<FieldContent>
							<FieldLabel>{mcp.authToken}</FieldLabel>
						</FieldContent>
						<div className="flex items-center gap-2 mt-2">
							<div className="relative flex-1">
								<Input
									readOnly
									type="text"
									value={token}
									placeholder={t.common.loading}
									className="font-mono pr-10"
								/>
								<div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
									<Button
										variant="ghost"
										size="icon"
										className="text-muted-foreground hover:text-foreground"
										onClick={handleCopyToken}
										disabled={!token}
										title={t.common.copy}
									>
										{tokenCopied ? (
											<Check className="size-4" />
										) : (
											<Copy className="size-4" />
										)}
									</Button>
								</div>
							</div>
							<Button
								variant="secondary"
								className="shrink-0"
								onClick={handleRotateToken}
							>
								{mcp.regenerate}
							</Button>
						</div>
					</Field>
				</FieldGroup>
			</FieldSet>

			<FieldSet className="mt-8 border-b pb-8">
				<FieldLegend>{mcp.availableRest}</FieldLegend>
				<FieldDescription>{mcp.availableRestDesc}</FieldDescription>
				<FieldGroup>
					{REST_APIS.map((api) => (
						<Field key={api.path} className="rounded-md border px-3 py-2">
							<FieldContent>
								<FieldLabel className="font-mono text-xs">
									{api.method} {api.path}
								</FieldLabel>
								<FieldDescription>{api.description}</FieldDescription>
							</FieldContent>
						</Field>
					))}
				</FieldGroup>
			</FieldSet>

			<FieldSet className="mt-8 border-b pb-8">
				<FieldLegend>{mcp.availableMcp}</FieldLegend>
				<FieldDescription>{mcp.availableMcpDesc}</FieldDescription>
				<FieldGroup>
					{MCP_TOOLS.map((tool) => (
						<Field key={tool.name} className="rounded-md border px-3 py-2">
							<FieldContent>
								<FieldLabel className="font-mono text-xs">
									{tool.name}
								</FieldLabel>
								<FieldDescription>{tool.description}</FieldDescription>
							</FieldContent>
						</Field>
					))}
				</FieldGroup>
			</FieldSet>

			<FieldSet className="mt-8">
				<FieldLegend>{mcp.clientGuides}</FieldLegend>
				<FieldDescription>{mcp.clientGuidesDesc}</FieldDescription>
				<FieldGroup>
					{CLIENT_GUIDES.map((client) => (
						<Field key={client.name} orientation="vertical">
							<FieldContent>
								<FieldLabel>{client.name}</FieldLabel>
								<FieldDescription>{client.description}</FieldDescription>
							</FieldContent>
							<div className="relative group/snippet">
								<pre className="rounded-md border bg-muted px-3 py-2 text-xs whitespace-pre-wrap pr-10">
									{token
										? client.snippet.replace(/<TOKEN>/g, token)
										: client.snippet}
								</pre>
								<Button
									variant="ghost"
									size="icon"
									className="absolute right-2 top-2 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/snippet:opacity-100"
									onClick={() =>
										copyToClipboard(
											token
												? client.snippet.replace(/<TOKEN>/g, token)
												: client.snippet,
											t.common.copied,
										)
									}
									disabled={!token}
									title={t.common.copy}
								>
									<Copy className="size-3" />
								</Button>
							</div>
						</Field>
					))}
				</FieldGroup>
			</FieldSet>
		</div>
	)
}
