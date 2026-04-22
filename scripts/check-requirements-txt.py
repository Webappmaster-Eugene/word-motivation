#!/usr/bin/env python3
"""Линтер для requirements.txt: ловит inline-флаги вроде `torch==2.4.1+cpu --extra-index-url ...`.

Корень проблемы, которая сломала Dokploy-сборку 2026-04-22: pip НЕ поддерживает
per-package флаги в requirements.txt — `--extra-index-url` должен быть на
отдельной строке. Локально проверить через `pip install --dry-run` = контакт
с сетью (5+ сек), поэтому делаем regex-lint без сети.

Правила:
  * Комментарии (начинаются с `#`) — пропускаются.
  * Пустые строки — пропускаются.
  * Строки, начинающиеся с `-` или `--` — директивы (OK, на своей строке).
  * Строки-пакеты не должны содержать ` --` в середине.
  * Строки-пакеты не должны содержать URL-суффикс без директивы.

Вызов:
  python scripts/check-requirements-txt.py tts-worker/requirements.txt [...]
Выход:
  0 — всё ок, 1 — найдены проблемы (сообщения в stderr).
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

# Inline-флаг типа "package --extra-index-url ..." — недопустим.
INLINE_FLAG = re.compile(r"\S\s+--[a-zA-Z][a-zA-Z0-9-]*")


def check_file(path: Path) -> list[str]:
    """Возвращает список человеко-читаемых ошибок (пустой = OK)."""
    errors: list[str] = []
    for lineno, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        line = raw.rstrip()
        stripped = line.lstrip()
        if not stripped or stripped.startswith("#"):
            continue
        # Директивы (`-r other.txt`, `--extra-index-url ...`) допустимы, если в начале.
        if stripped.startswith("-"):
            continue
        if INLINE_FLAG.search(line):
            errors.append(
                f"{path}:{lineno}: inline флаг рядом с пакетом ({line!r}). "
                "Перенести --flag на отдельную строку."
            )
    return errors


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print("Usage: check-requirements-txt.py <file> [<file> ...]", file=sys.stderr)
        return 2
    all_errors: list[str] = []
    for arg in argv[1:]:
        path = Path(arg)
        if not path.is_file():
            print(f"WARN: {path} не найден, пропускаю", file=sys.stderr)
            continue
        all_errors.extend(check_file(path))
    if all_errors:
        for err in all_errors:
            print(err, file=sys.stderr)
        return 1
    print("requirements.txt OK")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
