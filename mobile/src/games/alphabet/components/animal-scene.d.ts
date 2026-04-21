/**
 * Тип-алиас для `animal-scene`. В runtime Metro подставит:
 *   - `animal-scene.native.tsx` — Filament 3D (Android / iOS)
 *   - `animal-scene.web.tsx` — Skia 2D (web)
 *
 * Для TypeScript-компилятора — оба варианта экспортируют одинаковый интерфейс,
 * и это файл-декларация для резолва `./animal-scene` и `@/games/alphabet/components/animal-scene`.
 */
export { AnimalScene } from './animal-scene.web';
