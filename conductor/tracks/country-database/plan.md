# Track: country-database — База данных 145+ стран

## Spec

Создать базу данных стран с данными для расчёта боевого потенциала. Использовать Drizzle ORM + SQLite. Данные из открытых источников: Global Firepower, SIPRI, CIA Factbook, World Bank.

## Схема данных

```sql
countries (
  iso_code PK      -- ISO 3166-1 alpha-3 (RUS, USA, CHN, ...)
  name              -- Название (Россия, United States, ...)
  name_ru           -- Название на русском
  side              -- NATO | RUS | CHINA | NEUTRAL | OTHER
  coalition         -- НАТО | ОДКБ | АУКЮС | ЕАЭС | BRICS | NULL
  
  -- География
  area_km2          -- Площадь
  coastline_km      -- Береговая линия
  climate_zone      -- Климатическая зона
  
  -- Экономика
  gdp_ppp_bn        -- ВВП (ППС) в млрд $
  military_budget_bn -- Военный бюджет в млрд $
  defense_pct_gdp   -- % ВВП на оборону
  
  -- Люди
  population_m      -- Население (млн)
  active_personnel   -- Активный персонал ВС
  reserve_personnel  -- Резерв
  fit_for_service_m  -- Пригодны к службе (млн)
  
  -- Оружие (количество)
  total_tanks
  total_afv         -- ББМ
  total_artillery
  total_mlrs
  total_aircraft
  total_helicopters
  total_navy        -- Корабли всего
  submarines
  aircraft_carriers
  nuclear_warheads
  
  -- Логистика
  ports             -- Морские порты
  airfields         -- Аэродромы
  oil_production_kbd -- Нефтедобыча (тыс. баррелей/день)
  merchant_fleet    -- Торговый флот
  
  -- Качественные оценки (1-10)
  tech_level        -- Уровень технологий
  morale_index      -- Моральный дух
  combat_experience -- Боевой опыт
  c2_capability     -- Управление и связь
  ew_capability     -- РЭБ
  
  -- Вычисляемые
  bp_total          -- Итоговый БП (пересчитывается)
  bp_weapon         -- W
  bp_manpower       -- M
  bp_logistics      -- L
  bp_c2             -- C2
  bp_economy        -- E
  bp_doctrine       -- D
  bp_readiness      -- R
  bp_terrain        -- T
  
  updated_at        -- Дата обновления
)
```

## Plan

### Phase 1: Drizzle схема

- [ ] **Task 1.1**: Создать `src/db/schema.ts` — Drizzle схема таблицы countries
- [ ] **Task 1.2**: Создать миграцию через `drizzle-kit generate`
- [ ] **Task 1.3**: Применить миграцию к SQLite

### Phase 2: Seed-данные

- [ ] **Task 2.1**: Создать `src/db/seed/countries-data.ts` — данные 20 ключевых стран (Топ-20 GFP)
- [ ] **Task 2.2**: Создать `src/db/seed/countries-extended.ts` — данные 125+ остальных стран
- [ ] **Task 2.3**: Создать `src/db/seed/seed.ts` — скрипт заполнения БД
- [ ] **Task 2.4**: Заполнить БД и проверить целостность

### Phase 3: API доступа

- [ ] **Task 3.1**: `src/db/queries.ts` — getCountryByISO(), getAllCountriesBP(), getCountriesByCoalition()
- [ ] **Task 3.2**: `src/app/api/countries/route.ts` — REST API endpoint
- [ ] **Task 3.3**: Интеграция с bp-model — автопересчёт при изменении данных

## Acceptance Criteria

1. 145+ стран в БД с данными по 30+ полям
2. Топ-20 стран имеют полные данные (все поля заполнены)
3. REST API отдаёт JSON с БП-данными
4. Запрос getAllCountriesBP() < 100мс
