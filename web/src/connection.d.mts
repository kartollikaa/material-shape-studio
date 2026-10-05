export const REPOSITORY: string;
export const MARKETPLACE: string;
export const PLUGIN: string;
export interface InstallStep { label: string; command: string }
export interface InstallMethod { id: string; host: string; kind: string; link?: { label: string; href: string }; steps: InstallStep[]; note: string }
export interface ConnectionInstructions { available: boolean; packageSpec: string; prompt: string; methods: InstallMethod[]; verifyCommand: string; text: string }
export function connectionInstructions(version: string | undefined): ConnectionInstructions;
export function connectionHtml(instructions: ConnectionInstructions): string;
