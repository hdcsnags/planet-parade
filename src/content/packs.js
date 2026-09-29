// Content packs (content/packs/*.json), bundled at build time and validated by tools/validate.mjs.
const mods = import.meta.glob('../../content/packs/*.json', { eager: true, import: 'default' });
export const PACKS = Object.values(mods).sort((a, b) => a.order - b.order);
export const packById = id => PACKS.find(p => p.id === id);
export const packForTemplate = tpl => PACKS.find(p => p.levels.some(l => l.template === tpl));

export { mods };
