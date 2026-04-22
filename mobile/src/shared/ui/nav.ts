import type { useRouter } from 'expo-router';

type Router = ReturnType<typeof useRouter>;

/**
 * Безопасный переход на главную.
 *
 * Проблема: `router.back()` на web делает browser history back. Если пользователь
 * пришёл по прямой ссылке (`/games/alphabet`, share-link из мессенджера и т.п.),
 * браузер уйдёт за пределы приложения — на предыдущий сайт или покажет about:blank.
 *
 * Решение: сначала проверяем `canGoBack()`. Если история пуста (или мы на корневом
 * роуте стека) — делаем `replace('/')`, это перезаписывает текущий URL без мусорной
 * записи в истории.
 */
export function navigateHome(router: Router): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace('/');
}
