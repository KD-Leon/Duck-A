import { describe, expect, it, vi } from "vitest"
import { fetchModelsFromProvider } from "./fetch-models"

describe("fetchModelsFromProvider", () => {
	it("fetches and parses OpenAI compatible models", async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				data: [
					{ id: "deepseek-chat", name: "DeepSeek Chat" },
					{ id: "deepseek-reasoner", name: "DeepSeek Reasoner" },
					{ id: "qwen-vl-max", name: "Qwen VL Max" },
				],
			}),
		})

		const models = await fetchModelsFromProvider({
			baseURL: "https://api.deepseek.com/v1",
			apiKey: "test-key",
			fetch: mockFetch as any,
		})

		expect(models).toHaveLength(3)
		expect(models[0].id).toBe("deepseek-chat")
		expect(models[1].reasoning).toBe(true)
		expect(models[2].vision).toBe(true)
	})

	it("fetches Ollama models via /api/tags", async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				models: [{ name: "llama3:latest" }, { name: "llava:latest" }],
			}),
		})

		const models = await fetchModelsFromProvider({
			baseURL: "http://localhost:11434",
			protocol: "ollama",
			fetch: mockFetch as any,
		})

		expect(models).toHaveLength(2)
		expect(models[0].id).toBe("llama3:latest")
		expect(models[1].vision).toBe(true)
	})
})
