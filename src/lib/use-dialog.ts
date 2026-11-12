"use client";

import { useEffect, useRef } from "react";

/**
 * Общее поведение всплывающих окон продукта.
 *
 * Диалоги тактического HUD раньше закрывались только кликом по крестику:
 * Escape не работал, фокус уходил на страницу под окном, а фон продолжал
 * прокручиваться. Здесь собрано то, что уже было в «Анализе коалиций» и
 * «Сравнении стран», плюс ловушка фокуса, блокировка прокрутки и возврат
 * фокуса на кнопку, открывшую окно.
 *
 * Окна вкладываются: матрица сравнения открывает симулятор дуэли. Поэтому
 * открытые окна складываются в стек — Escape и Tab достаются только верхнему,
 * а прокрутка возвращается странице, когда закрылось последнее.
 */

const openStack: symbol[] = [];
let scrollLocks = 0;
let savedOverflow = "";
let savedPaddingRight = "";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function visibleFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.getClientRects().length > 0 && el.getAttribute("aria-hidden") !== "true",
  );
}

function lockScroll(): void {
  scrollLocks += 1;
  if (scrollLocks > 1) return;
  const body = document.body;
  savedOverflow = body.style.overflow;
  savedPaddingRight = body.style.paddingRight;
  // Полоса прокрутки исчезает вместе с overflow — компенсируем её ширину,
  // иначе страница под окном дёргается вбок при открытии.
  const gap = window.innerWidth - document.documentElement.clientWidth;
  body.style.overflow = "hidden";
  if (gap > 0) body.style.paddingRight = `${gap}px`;
}

function unlockScroll(): void {
  scrollLocks = Math.max(0, scrollLocks - 1);
  if (scrollLocks > 0) return;
  document.body.style.overflow = savedOverflow;
  document.body.style.paddingRight = savedPaddingRight;
}

export interface DialogOptions {
  /**
   * Модальное окно перекрывает страницу: фон не прокручивается, Tab ходит
   * только внутри окна, содержимое снаружи скрыто от диктора.
   * Немодальная панель (лаборатория сценариев) оставляет карту доступной,
   * поэтому получает Escape и возврат фокуса, но не ловушку и не блокировку.
   */
  modal?: boolean;
}

/**
 * Возвращает ref для контейнера окна. На контейнере должны стоять
 * `role="dialog"` и `aria-labelledby` с id заголовка; для модального —
 * ещё и `aria-modal="true"`.
 */
export function useDialog<T extends HTMLElement = HTMLDivElement>(
  isOpen: boolean,
  onClose: () => void,
  options: DialogOptions = {},
) {
  const { modal = true } = options;
  const containerRef = useRef<T | null>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const token = Symbol("dialog");
    openStack.push(token);
    if (modal) lockScroll();

    const isTop = () => openStack[openStack.length - 1] === token;
    const opener = document.activeElement as HTMLElement | null;

    // Фокус ставим внутрь окна, иначе экранный диктор продолжает читать
    // страницу под ним, а Tab уходит за пределы диалога.
    const focusTimer = window.setTimeout(() => {
      const root = containerRef.current;
      if (!root || !isTop()) return;
      const first = visibleFocusable(root)[0];
      (first ?? root).focus({ preventScroll: true });
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isTop()) return;
      const root = containerRef.current;

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
        return;
      }

      if (!modal || event.key !== "Tab" || !root) return;
      const items = visibleFocusable(root);
      if (items.length === 0) {
        event.preventDefault();
        root.focus({ preventScroll: true });
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === root)) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      } else if (!root.contains(active)) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown, true);
      const wasTop = isTop();
      const index = openStack.indexOf(token);
      if (index >= 0) openStack.splice(index, 1);
      if (modal) unlockScroll();
      // Возвращаем фокус кнопке, открывшей окно, если она ещё на странице.
      if (wasTop && opener && opener.isConnected) {
        opener.focus({ preventScroll: true });
      }
    };
  }, [isOpen, modal]);

  return containerRef;
}
