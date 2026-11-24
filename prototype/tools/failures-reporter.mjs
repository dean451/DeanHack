// A second test reporter for npm test (tools/run-tests.mjs): after the run, the failing tests again, each with its
// file and message, so the last lines of a CI log say what failed (the full TAP log is too long to scroll).
export default async function* failures(source) {
  const fails = [];
  for await (const e of source) if (e.type === 'test:fail' && e.data.details?.type !== 'suite') fails.push(e.data);
  if (!fails.length) return;
  yield `\n# ${fails.length} failing\n`;
  for (const f of fails) {
    const err = f.details?.error, msg = String(err?.cause?.message ?? err?.cause ?? err?.message ?? err ?? '').trim();
    yield `# not ok: ${f.name}\n#   at ${f.file ?? '?'}${f.line ? `:${f.line}` : ''}\n${msg.split('\n').slice(0, 12).map(l => `#   ${l}`).join('\n')}\n`;
  }
}
