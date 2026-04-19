// `setupFiles` Jest — запускается ДО инициализации test framework.
// Здесь нельзя использовать `expect`/`jest` globals. Только полифилы/env.
// Матчеры @testing-library подключаются через `setupFilesAfterEach`
// (см. package.json).
