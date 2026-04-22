#!/usr/bin/env python3
"""Линтер для Dockerfile: блокирует `:latest` в FROM — недетерминированно.

Легковесная проверка, чтобы не тянуть полноценный hadolint в pre-commit.
Покрывает самую частую ошибку: «FROM node:latest» вместо «FROM node:22-alpine».
Остальное (best-practices, security) — на CI через hadolint, если понадобится.

Вызов:
  python scripts/check-dockerfile.py <Dockerfile> [<Dockerfile> ...]
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

FROM_LATEST = re.compile(r"^\s*FROM\s+\S+:latest\b", re.IGNORECASE)


def check(path: Path) -> list[str]:
    errors: list[str] = []
    for lineno, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if FROM_LATEST.match(raw):
            errors.append(
                f"{path}:{lineno}: :latest в FROM — используй явную версию ({raw.strip()!r})."
            )
    return errors


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print("Usage: check-dockerfile.py <Dockerfile> [<Dockerfile> ...]", file=sys.stderr)
        return 2
    all_errors: list[str] = []
    for arg in argv[1:]:
        path = Path(arg)
        if not path.is_file():
            continue
        all_errors.extend(check(path))
    if all_errors:
        for err in all_errors:
            print(err, file=sys.stderr)
        return 1
    print("Dockerfiles OK")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
