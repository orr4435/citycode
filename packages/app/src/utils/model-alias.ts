// White-label display names for models. Applied where provider/model data enters the
// app store, so every surface (model picker, prompt controls, tooltips, message
// metadata) shows the alias. Only the display `name` changes — the real provider and
// model IDs are still what's sent to the API and stored in sessions.
const ALIASES: { match: (providerID: string, modelID: string) => boolean; name: string }[] = [
  { match: (providerID, modelID) => providerID === "deepseek" || /deepseek/i.test(modelID), name: "DS-V1" },
]

export function modelDisplayName(providerID: string, modelID: string, name: string): string {
  return ALIASES.find((alias) => alias.match(providerID, modelID))?.name ?? name
}

const PROVIDER_ALIASES: Record<string, string> = { deepseek: "MASHCAL" }

export function providerDisplayName(providerID: string, name: string): string {
  return PROVIDER_ALIASES[providerID] ?? name
}
