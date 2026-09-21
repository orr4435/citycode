import { describe, expect, test } from "bun:test"
import { modelDisplayName } from "./model-alias"

describe("modelDisplayName", () => {
  test("shows DS-V1 instead of the real name for DeepSeek models", () => {
    expect(modelDisplayName("deepseek", "deepseek-v4-flash", "DeepSeek V4 Flash")).toBe("DS-V1")
    expect(modelDisplayName("openrouter", "deepseek/deepseek-chat", "DeepSeek Chat")).toBe("DS-V1")
  })

  test("leaves every other model name untouched", () => {
    expect(modelDisplayName("anthropic", "claude-sonnet", "Claude Sonnet")).toBe("Claude Sonnet")
  })
})
