import { test, expect } from '@playwright/test';
import { isCiEnvironment } from '../src/lib/env';

// Регресс на run CI 43248960187: GitHub Actions ставит CI=true, а код проверял
// CI === "1". Детект молча возвращал false, из-за чего в CI включался живой
// авто-refresh датасета и не срабатывал тест-хук сбоя pipeline.
test.describe('CI environment detection', () => {
  test('recognises the CI values real providers set', () => {
    expect(isCiEnvironment({ CI: 'true' })).toBe(true); // GitHub Actions, GitLab
    expect(isCiEnvironment({ CI: '1' })).toBe(true); // локальный прогон, часть раннеров
    expect(isCiEnvironment({ CI: 'TRUE' })).toBe(true);
    expect(isCiEnvironment({ CI: ' true ' })).toBe(true);
  });

  test('treats unset and explicitly disabled values as not CI', () => {
    expect(isCiEnvironment({})).toBe(false);
    expect(isCiEnvironment({ CI: '' })).toBe(false);
    expect(isCiEnvironment({ CI: '0' })).toBe(false);
    expect(isCiEnvironment({ CI: 'false' })).toBe(false);
    expect(isCiEnvironment({ CI: 'off' })).toBe(false);
  });
});
