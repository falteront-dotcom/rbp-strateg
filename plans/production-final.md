# Финальный продакшн: страны, объекты, подписи, дизайн, реальная информация

## Контекст

Текущее состояние (уже задеплоено, сервер `localhost:3013`, все гейты зелёные):

- **195 государств** в БД (World Bank + mledoze + 18 агентов GLM-5.3), BP рассчитан для всех.
- **329 стратегических объектов** (две волны GLM-5.3, дедуплицировано): символы 10 типов, декластеризация, карточка, toggle, чипы-фильтры типов.
- **30 зон конфликтов** с кольцами театров, карточкой, toggle (по умолчанию выкл.).
- API: `/api/countries`, `/api/countries/[iso]`, `/api/facilities`, `/api/conflict-zones`.
- Команда пользователя: довести до **полного продакшна** — все страны ✓, все объекты ✓, но нужно добить: подписи объектов, интеграцию «реальной информации» в панель страны, дизайн-полировку новых элементов.

Что осталось (обнаружено при ревизии): данные объектов/конфликтов живут только на карте — панель страны их не показывает; маркеры объектов не имеют подписей ни на одном зуме; чипы фильтров без счётчиков; карточка объекта (`facilityCard`) и чипы типов (`typeFilters`, bottom: 208px) могут наезжать друг на друга на средних ширинах; 11-я вкладка сломает сетку `grid-cols-5` (10 вкладок, 2 ряда).

## Подход

Одна итерация: статические generated-данные (уже в бандле) подключаются напрямую в панель страны без API-вызовов; подписи объектов добавляются по тому же принципу, что и подписи стран (screen-space, декластеризация); дизайн правится точечно в `StrategicAtlas.module.css` и `page.tsx`. После каждого блока — гейты.

## Файлы для изменения

| Файл | Изменение |
|---|---|
| `src/components/strategic/FacilitiesTab.tsx` | **Новый**: вкладка «Объекты» — hosted по типам (группировка), operated abroad, зоны конфликтов страны; алиасы PHI/PHL; пустое состояние |
| `src/app/page.tsx` | 11-я вкладка `facilities` («Объекты»); сетка таблицы `grid-cols-5` → `grid-cols-6` (11 = 6+5, обе строки без overflow — проверка тестом `scrollWidth <= clientWidth`) |
| `src/components/map/StrategicAtlas.tsx` | Подписи объектов при `camera.k >= 3`: nameRu рядом с маркером, та же screen-space техника, что `visibleLabels`, с отдельной декластеризацией и лимитом (~12); счётчики в чипах типов (`Авиабаза · 141`); исключить наложение `facilityCard`/`conflictCard` на чипы |
| `src/components/map/StrategicAtlas.module.css` | Стили `.facilityLabel`; позиционирование карточек (top, под toolbar, над чипами); `@container`/mobile: чипы скрыты ≤1100px (уже есть), карточки — нет |
| `scripts/test-map.py` | Сценарии: вкладка «Объекты» видна у США (hosted>0), у DEU есть Ramstein; подписи объектов появляются после zoom-in ×3 и не пересекаются; чип показывает счётчик; 11 вкладок без overflow |
| `scripts/build-facilities.py` | Точечная выверка: спот-проверка 10 координат волны-2 (Ramstein, Norfolk, Engels, Karwar, Alcantara…) против известных значений, отклонение >1° → warn в отчёт генератора |
| `docs/MAP-OVERHAUL.md` | Финал: подписи объектов, вкладка «Объекты», 329/30/195 |

## Переиспользование

- `FACILITY_TYPE_LABELS_RU`, `CONFLICT_TYPE_LABELS_RU`, типы — `src/lib/facilities/types.ts` (готово).
- `STRATEGIC_FACILITIES`, `CONFLICT_ZONES` — generated TS, уже в бандле (импорт без fetch).
- Алиас-логика PHI/PHL — скопировать паттерн из `src/app/api/countries/[iso]/route.ts`.
- Подписи стран (`visibleLabels`, screen-scale inverse transform) — образец для подписей объектов.
- CSS-классы `.facilityCard`, `.eyebrow`, `.facilityMeta/.facilityNote/.facilitySource` — уже есть.

## Шаги

- [x] 1. `FacilitiesTab.tsx`: три секции (конфликты / на территории по типам / оперирует за рубежом), пустое состояние, RU-лейблы, значимость/оператор/хост
- [x] 2. `page.tsx`: `StrategicTab + "facilities"`, `STRATEGIC_TABS + { Объекты }`, рендер `<FacilitiesTab isoCode={country.isoCode} />`, `grid-cols-6`
- [x] 3. Подписи объектов: `visibleFacilityLabels` (k≥3, лимит 12, screen-space boxes, no-overlap), рендер `<text>` рядом с символом
- [x] 4. Чипы типов: счётчик `{label} · {count}` из `STRATEGIC_FACILITIES`
- [x] 5. Дизайн-полировка: карточки объектов/зон — фиксированная позиция под toolbar (правый верх), max-height + скролл; проверка 1600×1000 и 1280×800
- [x] 6. Спот-проверка координат волны-2 в генераторе (warn >1°)
- [x] 7. Тесты `test-map.py` (вкладка, подписи, счётчики, 11 вкладок)
- [x] 8. Гейты: `typecheck`, `lint` (0 warnings), `build`, `test-map.py`, `audit-ui.py`, `audit-all-surfaces.py`, скриншоты (`facilities-labels.png`, `country-objects-tab.png`), `git diff --check`
- [x] 9. Документация + обновление todo + финальный отчёт со скриншотами

## Верификация

```bash
npm run typecheck && npm run lint && npm run build
PYTHONIOENCODING=utf-8 python scripts/test-map.py http://localhost:3013
PYTHONIOENCODING=utf-8 python scripts/audit-ui.py http://localhost:3013
PYTHONIOENCODING=utf-8 python scripts/audit-all-surfaces.py http://localhost:3013
```

Приёмка: 195 стран / 329 объектов / 30 зон отдаются API; вкладка «Объекты» у США показывает hosted-объекты и зоны; после zoom×3 подписи объектов читаемы и не пересекаются; 11 вкладок без горизонтального overflow; все 3 браузерных регресса PASS; визуальный скриншот-ревью.
