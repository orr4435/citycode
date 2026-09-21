import { describe, expect, test } from "bun:test"
import { displayName, parse } from "../../src/util/model"

describe("util.model", () => {
  test("splits provider from a nested model identifier", () => {
    expect(parse("provider/org/model")).toEqual({ providerID: "provider", modelID: "org/model" })
    expect(parse("invalid")).toEqual({ providerID: "invalid", modelID: "" })
  })

  test("shows DS-V1 instead of the real name for DeepSeek models", () => {
    expect(displayName("deepseek", "deepseek-v4-flash", "DeepSeek V4 Flash")).toBe("DS-V1")
    expect(displayName("openrouter", "deepseek/deepseek-chat", "DeepSeek Chat")).toBe("DS-V1")
  })

  test("leaves every other model name untouched", () => {
    expect(displayName("anthropic", "claude-sonnet", "Claude Sonnet")).toBe("Claude Sonnet")
    expect(displayName("anthropic", "claude-sonnet")).toBe("claude-sonnet")
  })
})
