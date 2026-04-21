# Подключение настоящего 3D на Android (M4.5)

Сейчас сцена животного — 2D Skia (работает и на web, и на native). Чтобы заменить на **настоящий 3D через Google Filament**:

## 1. Скачать CC0-модели

[**Quaternius — Ultimate Animated Animals**](https://quaternius.com/packs/ultimateanimatedanimals.html) — 30+ животных с риггингом и анимациями, CC0.

Альтернативы для недостающих:
- [Poly Pizza](https://poly.pizza/) — CC-BY / CC0 (аист, тукан, шиншилла)
- [Sketchfab CC0](https://sketchfab.com/features/free-3d-models) — ящерица, шмель

Распакуй в `project/mobile/assets/models/*.glb`. **Имена должны совпадать с `ContentAnimal.id`** в БД:
```
mobile/assets/models/
├── dog.glb
├── cat.glb
├── lion.glb
├── stork.glb
...
```

## 2. Оптимизировать размер

Raw GLB может быть 2–10 MB — для 50+ моделей получится 100+ MB в APK. Используй `gltf-transform` для draco-compression и quantization:

```sh
npx gltf-transform optimize mobile/assets/models/dog.glb mobile/assets/models/dog.glb \
  --compress draco --quantize
```

Цель: **<500 KB на модель**. Скрипт-wrapper:
```sh
for f in mobile/assets/models/*.glb; do
  npx gltf-transform optimize "$f" "$f" --compress draco --quantize
done
```

## 3. Установить native-модули

```sh
cd project/mobile
npm install react-native-filament@^0.17 @marginalized/react-native-worklets-core
```

## 4. Rebuild dev-client

Filament требует native-linking → нужна свежая Android-сборка.

**Локально (если есть Android Studio + SDK + NDK):**
```sh
npx expo prebuild --clean --platform android
npx expo run:android
```

**Через EAS (в облаке):**
```sh
npx eas build --profile development --platform android
```

## 5. Активировать компонент

1. Переименуй в проекте:
   - `src/games/alphabet/components/filament-animal-scene.tsx.template` → `animal-scene.native.tsx`
   - `src/games/alphabet/components/animal-scene.tsx` → `animal-scene.web.tsx`

2. Раскомментируй код в `animal-scene.native.tsx` (весь блок `/* ... */`).

3. Обнови `require`-маппинг `MODEL_MAP` — добавь все 50+ животных.

4. Проверь что `tsc --noEmit` зелёный.

5. `npx expo start --dev-client` → открой на телефоне.

## 6. Edge cases

- **Животное без GLB** → компонент автоматически падает на `animal-scene.web.tsx` (Skia-fallback).
- **Low-end Android (<3 GB RAM)** → в `FilamentView` можно передать `quality="low"` или в рантайме детектить через `react-native-device-info` и переключать на Skia.
- **Память**: Filament держит одну активную сцену. `<FilamentView key={animal.id}>` гарантирует, что при смене животного прошлая сцена dispose'нется.

## 7. Когда это имеет смысл

Делать Filament **до того как** добавлены реальные GLB — **не имеет смысла**: получишь чёрный прямоугольник вместо сцены. Skia-fallback выглядит красиво и работает. Filament подключаем **только** когда есть ≥5 качественных моделей.

## 8. Лицензии и атрибуция

- Quaternius CC0 — атрибуция не требуется, но **желательна** (уважение к автору).
- Poly Pizza CC-BY — **обязательна** в экране «Благодарности авторам» (`src/shared/screens/about.tsx`).

Пример строки:
```
3D-модель «Собака» © Quaternius (CC0, Public Domain)
3D-модель «Фламинго» © Poly by Google (CC-BY), https://poly.pizza/m/...
```
