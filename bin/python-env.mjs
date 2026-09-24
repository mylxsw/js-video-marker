import { spawnSync } from 'node:child_process';

export function findPythonWithNumpy() {
  const candidates = [process.env.VIDEO_MAKER_PYTHON, 'python3', '/opt/homebrew/bin/python3', 'python'].filter(Boolean);
  return candidates.find(bin => spawnSync(bin, ['-c', 'import numpy'], { stdio: 'ignore' }).status === 0) || null;
}
