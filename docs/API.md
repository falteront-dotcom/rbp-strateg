# Публичный API v1

Публичное read-only API «РБП-Стратег 2.0»: список стран с БП, рейтинг модели
БП 3.0 с интервалами, Markdown-досье страны и паспорт модели. Ключи не нужны.

База: `https://rbp-strateg.onrender.com/api/public/v1` (см. «Оговорка про SLA»
в конце). Все эндпоинты — только GET.

## Эндпоинты

| Роут | Что возвращает | Кэш |
|---|---|---|
| `/countries` | Список стран с БП модели 2.0 (та же БД, что карта сайта) | `public, max-age=300` |
| `/ranking` | Рейтинг БП 3.0: медиана, P10–P90, rankStability | `public, max-age=300` |
| `/dossier?iso=XXX` | Markdown-досье страны (провенанс, интервалы, торнадо) | `no-store` |
| `/meta` | Паспорт: версия модели, веса, κ Dirichlet, источники, покрытие | `public, max-age=300` |

## /countries

```bash
curl -s https://rbp-strateg.onrender.com/api/public/v1/countries | jq '.count'
# 195
```

Ответ: `{ "apiVersion": "v1", "count": 195, "countries": [ ... ] }`.
Каждая страна — форма `CountryApiData` (camelCase, маппер `src/db/country-mapper.ts`)
плюс `bpRank` (1 — максимум `bpTotal`). Сортировка — по `bpTotal` по убыванию.

## /ranking

```bash
curl -s https://rbp-strateg.onrender.com/api/public/v1/ranking | jq '.ranking[0]'
# { "iso": "USA", "name": "США", "rank": 1, "total": 90.1,
#   "p10": 84.4, "p90": 94.7, "deltaV2": -7.5, "hasUP": true, ... }  # замер 2026-11-13
```

Ответ: `{ "apiVersion": "v1", "model": "bp3", "count": N, "ranking": [ ... ] }`.
Строка рейтинга:

- `total` — медиана Монте-Карло (4000 итераций), шкала 0–100;
- `p10`/`p90` — интервал, покрывающий весовую неопределённость (веса тянутся
  из Dirichlet κ=100 на каждой итерации), а не только разброс входов;
- `rankStability`: `rankP10`–`rankP90` (интервал ранга), `pAboveNext` —
  вероятность стоять выше следующего соседа по медиане (null у последней строки);
- `components` — 10 компонентов: `{key, label, score, weight}`;
- `deltaV2` — сдвиг против модели 2.0; `hasUP: false` — у страны нулевая
  базовая линия U/P (оценка нижней границы, не полноценно сопоставимая).

## /dossier?iso=XXX

```bash
curl -s -OJ 'https://rbp-strateg.onrender.com/api/public/v1/dossier?iso=USA'
# → dossier-USA-YYYY-MM-DD.md (attachment, text/markdown)
```

Контент идентичен `/api/v3/dossier` — один построитель `buildDossierMarkdown`
(`src/lib/dossier.ts`). Ошибки: `400` без `iso`, `404` неизвестная страна.
`iso` регистронезависим, обрезается по пробелам.

## /meta

```bash
curl -s https://rbp-strateg.onrender.com/api/public/v1/meta | jq '.model.weightConcentration'
# 100
```

Паспорт API: версия модели (`3.0`), веса всех 10 компонентов
(`DEFAULT_WEIGHTS_BP3`, сумма 1.0), `weightConcentration` (κ Dirichlet),
источники данных, покрытие (195 стран; 10 качественных бенчмарков и 133
GFP-референса), текущий rate-limit, ссылки на `/v3/methodology` и
`docs/weights-elicitation.md`.

## Rate limiting

Token bucket на IP в памяти инстанса:

- лимит `RBP_RATE_LIMIT_PER_MIN` запросов в минуту (по умолчанию 60),
  burst — до лимита сразу, пополнение равномерное `limit/60` в секунду;
- при превышении — `429` с заголовком `Retry-After` (секунды) и телом
  `{ "error": "rate limit exceeded", "retryAfterSec": N }`;
- лимит на инстанс: Render free — один процесс, после рестарта бакеты пусты.

IP берётся из первого адреса `x-forwarded-for` (за прокси Render); при прямом
обращении — считывается как один локальный клиент.

## Версионирование

- `v1` заморожена: поля существующих ответов не удаляются и не меняют тип.
  Допустимые изменения внутри v1 — добавление новых полей и новых роутов;
  потребители обязаны игнорировать незнакомые поля.
- Ломающие изменения (удаление/переименование полей, смена семантики) —
  только в новой мажорной версии (`v2`) с периодом параллельной жизни.
- Модель БП и API версионируются независимо: `meta.model.version` описывает
  модель, `apiVersion` — форму ответов.

## Оговорка про SLA (честно)

Прод работает на Render free: инстанс один, засыпает после ~15 минут тишины,
первый запрос после сна — до десятков секунд. In-memory rate-limit и кэш
привязаны к инстансу и сбрасываются при каждом рестарте. API обслуживается
best-effort, без гарантий доступности и без SLA. Свежесть данных ограничена
коммитными сидами; живой pipeline источников проверяется еженедельно
(`pipeline-refresh.yml`), но прод между проверками может отставать от master.

Регресс-контракт: `e2e/public-api.spec.ts` (все 4 роута, burst → 429,
изоляция лимита по IP).
