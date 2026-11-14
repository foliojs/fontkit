import { DefaultShaper } from './DefaultShaper';

const SHAPERS = new Map();
registerShaper(DefaultShaper);

export function registerShaper(shaper, scripts = shaper.scripts) {
  for (let script of scripts) {
    SHAPERS.set(script, shaper);
  }
}

export function choose(script) {
  if (!Array.isArray(script)) {
    script = [script];
  }

  for (let s of script) {
    let shaper = SHAPERS.get(s);
    if (shaper) {
      return shaper;
    }
  }

  return DefaultShaper;
}
