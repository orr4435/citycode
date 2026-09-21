import type { Provider } from "@opencode-ai/sdk/v2"

export function parse(value: string) {
  const [providerID, ...modelID] = value.split("/")
  return { providerID, modelID: modelID.join("/") }
}

export function index(list: Provider[] | undefined) {
  return new Map((list ?? []).map((item) => [item.id, item] as const))
}

export function get(list: Provider[] | ReadonlyMap<string, Provider> | undefined, providerID: string, modelID: string) {
  const provider =
    list instanceof Map
      ? list.get(providerID)
      : Array.isArray(list)
        ? list.find((item) => item.id === providerID)
        : undefined
  return provider?.models[modelID]
}

// White-label display names. Only affects what's rendered in the UI — the real
// provider/model IDs are still what's sent to the API and stored in sessions.
const DISPLAY_ALIASES: { match: (providerID: string, modelID: string) => boolean; name: string }[] = [
  { match: (providerID, modelID) => providerID === "deepseek" || /deepseek/i.test(modelID), name: "DS-V1" },
]

const PROVIDER_ALIASES: Record<string, string> = { deepseek: "MASHCAL" }

export function providerDisplayName(providerID: string, name: string) {
  return PROVIDER_ALIASES[providerID] ?? name
}

export function displayName(providerID: string, modelID: string, name?: string) {
  return DISPLAY_ALIASES.find((alias) => alias.match(providerID, modelID))?.name ?? name ?? modelID
}

export function name(
  list: Provider[] | ReadonlyMap<string, Provider> | undefined,
  providerID: string,
  modelID: string,
) {
  return displayName(providerID, modelID, get(list, providerID, modelID)?.name)
}
