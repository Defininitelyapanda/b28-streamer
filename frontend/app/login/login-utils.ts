export type Persona = "streamer" | "filmmaker";

export { resolvePostAuthRedirect } from "@/lib/streaming-access";

export function parsePersona(value: string | null): Persona | null {
  if (value === "streamer" || value === "filmmaker") return value;
  return null;
}

export function personaToAccountType(persona: Persona): "STREAMER" | "FILMMAKER" {
  return persona === "filmmaker" ? "FILMMAKER" : "STREAMER";
}
