export type Cell = { month: string; week: number }; // month="YYYYMM"

// Devuelve todas las celdas {month, week} que cubre una actividad
export function expandRangeToMonthWeekCells(
  startMonth: string,  // ej: "202509"
  startWeek: number,   // ej: 1
  endMonth: string,    // ej: "202510"
  endWeek: number      // ej: 3
): Cell[] {
  const result: Cell[] = [];
  let current = parseInt(startMonth, 10);
  const end = parseInt(endMonth, 10);

  while (true) {
    const isStart = current === parseInt(startMonth, 10);
    const isEnd   = current === end;

    const minW = isStart ? startWeek : 1;
    const maxW = isEnd   ? endWeek   : 4;

    for (let w = minW; w <= maxW; w++) {
      result.push({ month: String(current), week: w });
    }

    if (isEnd) break;

    // incrementar mes YYYYMM
    let y = Math.floor(current / 100);
    let m = current % 100;
    m++;
    if (m > 12) { m = 1; y++; }
    current = y * 100 + m;
  }

  return result;
}

export const keyMW = (m: string, w: number) => `${m}:W${w}`;