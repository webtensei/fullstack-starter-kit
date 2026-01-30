import { startOtel, stopOtel } from './otel';

export async function startObservability() {
  if (process.env.OTEL_ENABLED?.toLowerCase() === 'false') return;
  await startOtel();
}

export async function stopObservability() {
  await stopOtel();
}

