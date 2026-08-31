import { describe, expect, it } from "vitest"
import { API_MODELS_MAP, detectModelCapabilities } from "./provider-registry"

describe("provider-registry", () => {
	it("detects vision, reasoning, and tool capabilities accurately", () => {
		const gpt4o = detectModelCapabilities("gpt-4o")
		expect(gpt4o.vision).toBe(true)
		expect(gpt4o.reasoning).toBe(false)
		expect(gpt4o.toolCall).toBe(true)

		const deepseekR1 = detectModelCapabilities("deepseek-reasoner")
		expect(deepseekR1.vision).toBe(false)
		expect(deepseekR1.reasoning).toBe(true)

		const claudeSonnet = detectModelCapabilities("claude-3-5-sonnet-20241022")
		expect(claudeSonnet.vision).toBe(true)
		expect(claudeSonnet.toolCall).toBe(true)

		const qwenVL = detectModelCapabilities("Qwen/Qwen2.5-VL-72B-Instruct")
		expect(qwenVL.vision).toBe(true)
	})

	it("has preset models configured for providers", () => {
		expect(API_MODELS_MAP.openai.length).toBeGreaterThan(0)
		expect(API_MODELS_MAP.deepseek).toContain("deepseek-chat")
		expect(API_MODELS_MAP.deepseek).toContain("deepseek-reasoner")
		expect(API_MODELS_MAP.siliconflow.length).toBeGreaterThan(0)
	})
})
