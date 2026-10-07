/**
 * Экспорт данных страны: CSV и JSON прямо из браузера (без сервера).
 *
 * Принцип честности: выгружаем ровно то, что видит пользователь, с
 * указанием источника (World Bank vs оценки IISS/GFP) в каждом файле.
 */

import type { CountryCompareData } from "@/lib/comparison";
import { EQUIPMENT_INDEX } from "@/lib/data/equipment.generated";
import { WEAPON_SPECS } from "@/lib/data/weapons.generated";
import { DOSSIER_INDEX } from "@/lib/data/dossiers.generated";
import { WORLD_BANK_INDEX, WORLD_BANK_SOURCE } from "@/lib/data/world-bank.generated";
import { HISTORICAL_BATTLES } from "@/lib/data/battles.generated";
import { MILITARY_CAMPAIGNS } from "@/lib/data/campaigns.generated";

/** Экранирует значение для CSV (RFC 4180). */
function csvCell(value: string | number | null): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csvRow(cells: (string | number | null)[]): string {
  return cells.map(csvCell).join(";");
}

function download(filename: string, content: string, mime: string): void {
  const blob = new Blob(["\uFEFF" + content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** CSV-справка по стране: техника, образцы, история, показатели. */
export function exportCountryCSV(country: CountryCompareData): void {
  const iso = country.isoCode;
  const lines: string[] = [];

  lines.push(csvRow([`# РБП-Стратег — справка по стране: ${country.nameRu} (${iso})`]));
  lines.push(csvRow([`# Источники: оценки IISS/GFP; реальные показатели — ${WORLD_BANK_SOURCE}`]));
  lines.push("");

  lines.push(csvRow(["Раздел", "Показатель", "Значение", "Примечание"]));
  lines.push(csvRow(["Сводка", "БП итоговый", country.bpTotal, ""]));
  lines.push(csvRow(["Сводка", "Сторона", country.side, ""]));
  lines.push(csvRow(["Сводка", "Коалиция", country.coalition, ""]));
  lines.push(csvRow(["Экономика", "ВВП (ППС), млрд", country.gdpPppBn, "оценка"]));
  lines.push(csvRow(["Экономика", "Военный бюджет, млрд", country.militaryBudgetBn, "оценка"]));
  lines.push(csvRow(["Личный состав", "Активный", country.activePersonnel, ""]));
  lines.push(csvRow(["Личный состав", "Резерв", country.reservePersonnel, ""]));
  lines.push(csvRow(["Техника", "Танки", country.totalTanks, ""]));
  lines.push(csvRow(["Техника", "БТР/БМП", country.totalAfv, ""]));
  lines.push(csvRow(["Техника", "Артиллерия", country.totalArtillery, ""]));
  lines.push(csvRow(["Техника", "Самолёты", country.totalAircraft, ""]));
  lines.push(csvRow(["Техника", "Корабли", country.totalNavy, ""]));
  lines.push(csvRow(["Техника", "Подлодки", country.submarines, ""]));
  lines.push(csvRow(["Ядерное", "Боеголовки", country.nuclearWarheads, "оценка FAS"]));

  const wb = WORLD_BANK_INDEX[iso];
  if (wb) {
    lines.push("");
    lines.push(csvRow([`Реальные данные (${WORLD_BANK_SOURCE})`]));
    if (wb.milSpendPctGdp !== null) lines.push(csvRow(["Расходы % ВВП", wb.milSpendPctGdp, `год ${wb.milSpendPctGdpYear}`, "MS.MIL.XPND.GD.ZS"]));
    if (wb.milSpendUsd !== null) lines.push(csvRow(["Расходы $", wb.milSpendUsd, `год ${wb.milSpendUsdYear}`, "MS.MIL.XPND.CD"]));
    if (wb.armedForcesPersonnel !== null) lines.push(csvRow(["Численность ВС", wb.armedForcesPersonnel, `год ${wb.personnelYear}`, "MS.MIL.TOTL.P1"]));
  }

  const equipment = EQUIPMENT_INDEX[iso];
  if (equipment?.entries.length) {
    lines.push("");
    lines.push(csvRow(["Парк техники (модельная)", "Категория", "Модель", "Кол-во", "Примечание"]));
    for (const e of equipment.entries) {
      lines.push(csvRow(["", e.cat, e.model, e.count, e.note ?? ""]));
    }
  }

  const weapons = WEAPON_SPECS.filter(w => w.originIso === iso);
  if (weapons.length) {
    lines.push("");
    lines.push(csvRow(["Образцы ВВТ (ТТХ)", "Категория", "Модель", "Масса, т", "Дальность", "Год", "На вооружении"]));
    for (const w of weapons) {
      lines.push(csvRow(["", w.category, w.name, w.weightTons, w.rangeKm, w.yearInService, w.armamentRu]));
    }
  }

  const battles = HISTORICAL_BATTLES.filter(b => b.isoCodes.includes(iso));
  if (battles.length) {
    lines.push("");
    lines.push(csvRow(["Сражения", "Год", "Место", "Итог", "Потери (оценка)"]));
    for (const b of battles) {
      lines.push(csvRow(["", b.year, b.locationRu, b.outcomeRu, b.casualtiesRu]));
    }
  }

  const campaigns = MILITARY_CAMPAIGNS.filter(c => c.isoCodes.includes(iso));
  if (campaigns.length) {
    lines.push("");
    lines.push(csvRow(["Кампании", "Годы", "ТВД", "Цель", "Итог"]));
    for (const c of campaigns) {
      lines.push(csvRow(["", c.startYear === c.endYear ? c.startYear : `${c.startYear}-${c.endYear}`, c.theatreRu, c.objectiveRu, c.outcomeRu]));
    }
  }

  download(`rbp-${iso}-spravka.csv`, lines.join("\n"), "text/csv");
}

/** JSON-выгрузка досье и показателей страны (для аналитиков). */
export function exportCountryJSON(country: CountryCompareData): void {
  const iso = country.isoCode;
  const payload = {
    generatedAt: new Date().toISOString(),
    source: {
      estimates: "IISS / GlobalFirepower / FAS (оценки)",
      real: WORLD_BANK_SOURCE,
    },
    country,
    dossier: DOSSIER_INDEX[iso] ?? null,
    worldBank: WORLD_BANK_INDEX[iso] ?? null,
    equipment: EQUIPMENT_INDEX[iso]?.entries ?? [],
    weapons: WEAPON_SPECS.filter(w => w.originIso === iso),
    battles: HISTORICAL_BATTLES.filter(b => b.isoCodes.includes(iso)),
    campaigns: MILITARY_CAMPAIGNS.filter(c => c.isoCodes.includes(iso)),
  };
  download(`rbp-${iso}-data.json`, JSON.stringify(payload, null, 2), "application/json");
}
