import type { Workbook } from 'exceljs';

export function serializeCsv(rows: readonly (readonly unknown[])[]): string {
  return rows.map(row => row.map(csvCell).join(',')).join('\r\n');
}

export function downloadCsv(filename: string, rows: readonly (readonly unknown[])[]): void {
  const blob = new Blob(['\uFEFF', serializeCsv(rows)], {
    type: 'text/csv;charset=utf-8'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function buildStyledQuarterlyWorkbook(
  rows: readonly (readonly unknown[])[]
): Promise<Workbook> {
  const { Workbook: ExcelWorkbook } = await import('exceljs');
  const workbook = new ExcelWorkbook();
  workbook.creator = 'Integrated Communication System';
  workbook.subject = 'Quarterly report';
  const worksheet = workbook.addWorksheet('Quarterly Report', {
    pageSetup: {
      orientation: 'landscape',
      paperSize: 5,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 }
    },
    views: [{ state: 'frozen', ySplit: 7 }]
  });
  const columnCount = Math.max(1, ...rows.map(row => row.length));
  const tableHeaderIndex = rows.findIndex(isQuarterlyTableHeader);

  rows.forEach((values, rowIndex) => {
    const row = worksheet.addRow(values.map(excelCellValue));
    const excelRowIndex = rowIndex + 1;
    const isTitle = rowIndex < 3 && values.length === 1;
    const isSection = rowIndex > tableHeaderIndex && tableHeaderIndex >= 0
      && values.length === 1 && values[0] !== '';
    const isHeader = isQuarterlyTableHeader(values);
    const isDataRow = rowIndex > tableHeaderIndex && tableHeaderIndex >= 0
      && values.length > 1;

    if ((isTitle || isSection) && columnCount > 1) {
      worksheet.mergeCells(excelRowIndex, 1, excelRowIndex, columnCount);
    }
    row.eachCell({ includeEmpty: true }, cell => {
      cell.alignment = { vertical: 'middle', wrapText: true };
      if (isDataRow) {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF4B5563' } },
          bottom: { style: 'thin', color: { argb: 'FF4B5563' } },
          left: { style: 'thin', color: { argb: 'FF4B5563' } },
          right: { style: 'thin', color: { argb: 'FF4B5563' } }
        };
      }
    });

    if (isTitle) {
      row.height = rowIndex === 0 ? 24 : 21;
      row.font = { name: 'Arial', bold: true, size: rowIndex === 0 ? 14 : 12, color: { argb: 'FF173B32' } };
      row.alignment = { horizontal: 'center', vertical: 'middle' };
    } else if (isSection) {
      row.height = 19;
      row.font = { name: 'Arial', bold: true, size: 10, color: { argb: 'FF173B32' } };
      row.alignment = { vertical: 'middle' };
    } else if (isHeader) {
      row.height = 32;
      row.font = { name: 'Arial', bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
      row.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    } else if (isDataRow) {
      row.font = { name: 'Arial', size: 9, color: { argb: 'FF111827' } };
    } else if (rowIndex === 4 || rowIndex === 5) {
      row.font = { name: 'Arial', size: 10, color: { argb: 'FF111827' } };
      for (const columnIndex of [1, 3]) {
        const label = row.getCell(columnIndex);
        if (label.value) {
          label.font = { name: 'Arial', bold: true, size: 10, color: { argb: 'FF173B32' } };
        }
      }
    }

    if (values.length === 0) {
      row.height = 8;
    }

    if (isHeader || isSection) {
      const fillColor = isHeader ? 'FF176B52' : 'FFE4F0E9';
      for (let columnIndex = 1; columnIndex <= columnCount; columnIndex++) {
        worksheet.getCell(excelRowIndex, columnIndex).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: fillColor }
        };
      }
    }
  });

  for (let columnIndex = 1; columnIndex <= columnCount; columnIndex++) {
    const header = tableHeaderIndex >= 0 ? rows[tableHeaderIndex][columnIndex - 1] : undefined;
    let width = header ? Math.min(34, Math.max(12, String(header).length + 2)) : 14;
    if (tableHeaderIndex >= 0 && String(rows[tableHeaderIndex][1] ?? '').toUpperCase() === 'PARTICULAR') {
      width = columnIndex === 1 ? 26 : columnIndex === 2 ? 56 : 13;
    } else if (columnIndex === 1 && tableHeaderIndex >= 0) {
      width = 24;
    }

    worksheet.getColumn(columnIndex).width = width;
  }

  return workbook;
}

export async function downloadStyledQuarterlyExcel(
  filename: string,
  rows: readonly (readonly unknown[])[]
): Promise<void> {
  const workbook = await buildStyledQuarterlyWorkbook(rows);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function isQuarterlyTableHeader(row: readonly unknown[]): boolean {
  return row.some(cell =>
    typeof cell === 'string' &&
    ['PARTICULAR', 'CHURCH', 'CHURCHES/COMPANY', 'QUARTER', 'TYPE'].includes(cell.toUpperCase())
  );
}

function excelCellValue(value: unknown): string | number | boolean | null {
  if (value == null) {
    return null;
  }
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? value
    : String(value);
}

export function csvFilenamePart(value: string): string {
  const filenamePart = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return filenamePart || 'report';
}

export interface QuarterlyFormCsvItem {
  section: string;
  particular: string;
  value: unknown;
  quarterValues?: Partial<Record<'Q1' | 'Q2' | 'Q3' | 'Q4', unknown>>;
  total?: unknown;
  monthlyValues?: Record<string, number | null>;
}

export interface QuarterlyFormCsvInput {
  departmentId: number;
  departmentName: string;
  programName: string;
  churchName: string;
  districtName: string;
  districtPastorName?: string;
  year: number | string;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  items: readonly QuarterlyFormCsvItem[];
  months?: readonly string[];
}

export interface QuarterlyFormSourceQuarter {
  quarter?: string;
  year?: number | string;
  value: unknown;
  combined_value?: unknown;
  monthly_values?: Record<string, number | null>;
}

export interface QuarterlyFormSourceParticular {
  particular_name: string;
  quarters: readonly QuarterlyFormSourceQuarter[];
}

export interface QuarterlyFormSourceSection {
  program_name?: string;
  section_name?: string;
  particulars: readonly QuarterlyFormSourceParticular[];
}

export function buildQuarterlyFormCsvItems(
  sections: readonly QuarterlyFormSourceSection[],
  year: number,
  selectedQuarter: QuarterlyFormCsvInput['quarter']
): QuarterlyFormCsvItem[] {
  return sections.flatMap(section => section.particulars.map(particular => {
    const records = new Map<'Q1' | 'Q2' | 'Q3' | 'Q4', QuarterlyFormSourceQuarter>();
    for (const record of particular.quarters ?? []) {
      if (Number(record.year) !== year) {
        continue;
      }

      const quarterNumber = record.quarter?.toUpperCase().match(/(?:Q|QUARTER\s*)?([1-4])/);
      if (quarterNumber) {
        records.set(`Q${quarterNumber[1]}` as 'Q1' | 'Q2' | 'Q3' | 'Q4', record);
      }
    }

    const quarterValues = Object.fromEntries(
      (['Q1', 'Q2', 'Q3', 'Q4'] as const).map(quarter => {
        const record = records.get(quarter);
        return [
          quarter,
          record ? record.combined_value ?? record.value ?? '' : ''
        ];
      })
    ) as QuarterlyFormCsvItem['quarterValues'];
    const selectedRecord = records.get(selectedQuarter);
    const selectedValue = selectedRecord
      ? selectedRecord.combined_value ?? selectedRecord.value ?? ''
      : '';
    const total = Object.values(quarterValues ?? {}).reduce<number>(
      (sum, value) => sum + numericValue(value),
      0
    );
    return {
      section: section.program_name ?? section.section_name ?? '',
      particular: particular.particular_name,
      value: selectedValue,
      quarterValues,
      total,
      monthlyValues: selectedRecord?.monthly_values
    };
  }));
}

const DEPARTMENT_FORMS: Record<number, { organization: string; title: string }> = {
  13: {
    organization: 'NORTHERN LUZON PHILIPPINE UNION MISSION',
    title: "CHILDREN'S MINISTRIES DEPARTMENT"
  },
  14: {
    organization: 'NORTHEAST LUZON MISSION',
    title: 'STEWARDSHIP DEPARTMENT'
  },
  15: {
    organization: 'SABBATH SCHOOL & PERSONAL MINISTRIES',
    title: 'QUARTERLY MONITORING DEVICE'
  },
  16: {
    organization: 'NORTHEAST LUZON MISSION',
    title: 'MINISTERIAL DEPARTMENT'
  },
  17: {
    organization: 'ADVENTIST YOUTH MINISTRIES',
    title: 'QUARTERLY REPORT'
  },
  18: {
    organization: 'NORTHERN LUZON PHILIPPINE UNION MISSION',
    title: "WOMEN'S MINISTRIES"
  },
  19: {
    organization: 'NORTHEAST LUZON MISSION',
    title: 'COMMUNICATION DEPARTMENT'
  },
  20: {
    organization: 'NORTHEAST LUZON MISSION',
    title: 'ADVENTIST MISSION QUARTERLY REPORT FORM'
  },
  21: {
    organization: 'NORTHEAST LUZON MISSION',
    title: "SECRETARIAT'S STATISTICAL REPORT"
  }
};

const STEWARDSHIP_COLUMNS = [
  'No. of Church Members',
  'No. of STW Seminar conducted',
  'No. of STW Promotion conducted',
  'No. of Families visited & given STW awareness program',
  'No. of Certification Seminars conducted on Basic STW Educator',
  'No. of Pastors/Local church leaders as basic STW educator',
  'No. of STW sermons preached on Biblical Stewardship',
  'No. of Tithe Giving Units',
  '% of Members returning Tithe',
  'No. of church members practicing Combine Offering Plan',
  'Number of members participating in regular giving',
  'Number of notable challenges or success stories'
] as const;

const SECRETARIAT_COLUMNS = [
  'Churches',
  'Companies/Worship Group',
  'Church Attendance Second Sabbath Count',
  'Church Attendance Seventh Sabbath Count',
  'Church Membership at Beginning of the Quarter',
  'Members Added During Quarter',
  'Members Subtracted During Quarter',
  'Church Membership at End of the Quarter',
  'Sabbath School Attendance Second Sabbath Count',
  'Sabbath School Attendance Seventh Sabbath Count'
] as const;

export function buildQuarterlyFormCsvRows(input: QuarterlyFormCsvInput): unknown[][] {
  const form = DEPARTMENT_FORMS[input.departmentId];
  const title = input.departmentId === 17
    ? input.programName.toUpperCase()
    : form?.title ?? `${input.departmentName.toUpperCase()} QUARTERLY REPORT`;
  const rows: unknown[][] = [
    [form?.organization ?? input.departmentName.toUpperCase()],
    [title],
    [`QUARTERLY REPORT ${input.year}`],
    [],
    ['Name of District Pastor:', input.districtPastorName ?? '', 'District:', input.districtName],
    ['Church:', input.churchName, 'Quarter:', input.quarter],
    []
  ];

  if (input.departmentId === 14) {
    const months = input.months ?? [];
    rows.push([
      'CHURCH',
      ...STEWARDSHIP_COLUMNS,
      ...['Offering', 'Tithes'].flatMap(particular =>
        months.map(month => `${particular} ${month}`)
      )
    ]);
    rows.push([
      input.churchName,
      ...STEWARDSHIP_COLUMNS.map(column => valueFor(input.items, column)),
      ...['Offering', 'Tithes'].flatMap(particular =>
        months.map(month =>
          valueFor(input.items, particular, month)
        )
      )
    ]);
    return rows;
  }

  if (input.departmentId === 21) {
    rows.push(['CHURCHES/COMPANY', 'QUARTER', ...SECRETARIAT_COLUMNS]);
    rows.push([
      input.churchName,
      input.quarter,
      ...SECRETARIAT_COLUMNS.map(column => valueFor(input.items, column))
    ]);
    return rows;
  }

  if (input.departmentId === 17 && /statistics/i.test(input.programName)) {
    rows.push(['PARTICULAR', input.quarter]);
    rows.push(...input.items.map(item => [item.particular, item.value]));
    return rows;
  }

  const quarterHeaders = ['1ST QTR', '2ND QTR', '3RD QTR', '4TH QTR'];
  const additionalHeaders = [
    ...(input.departmentId === 18 ? ['TOTAL 1ST SEM', 'TOTAL 2ND SEM'] : [])
  ];
  rows.push(['', 'PARTICULAR', ...quarterHeaders, 'TOTAL', ...additionalHeaders]);
  let number = 0;
  for (const item of input.items) {
    if (item.section && !rows.some(row => row.length === 1 && row[0] === item.section)) {
      rows.push([item.section]);
    }

    number += 1;
    const quarterValues = quarterHeaders.map((_, index) => {
      const quarter = `Q${index + 1}` as 'Q1' | 'Q2' | 'Q3' | 'Q4';
      return item.quarterValues?.[quarter] ??
        (index === quarterIndex(input.quarter) ? item.value : '');
    });
    const quarterTotal = item.total ?? quarterValues.reduce<number>((total, value) => {
      const numericValue = Number(value);
      return value !== '' && value !== null && Number.isFinite(numericValue)
        ? total + numericValue
        : total;
    }, 0);
    const semesterValues = input.departmentId === 18
      ? [
          quarterValues.slice(0, 2).reduce<number>((total, value) => total + numericValue(value), 0),
          quarterValues.slice(2).reduce<number>((total, value) => total + numericValue(value), 0)
        ]
      : [];
    rows.push([
      number,
      item.particular,
      ...quarterValues,
      quarterTotal,
      ...semesterValues
    ]);
  }

  if (input.months?.length) {
    rows.push([]);
    rows.push(['MONTHLY VALUES', ...input.months]);
    for (const item of input.items.filter(item => item.monthlyValues)) {
      rows.push([
        item.particular,
        ...input.months.map(month => item.monthlyValues?.[month] ?? '')
      ]);
    }
  }

  return rows;
}

function numericValue(value: unknown): number {
  const parsedValue = Number(value);
  return value !== '' && value !== null && Number.isFinite(parsedValue) ? parsedValue : 0;
}

function valueFor(
  items: readonly QuarterlyFormCsvItem[],
  particular: string,
  month?: string
): unknown {
  const normalizedName = normalizeFormLabel(particular);
  const item = items.find(row => normalizeFormLabel(row.particular) === normalizedName);
  return month ? item?.monthlyValues?.[month] ?? '' : item?.value ?? '';
}

function normalizeFormLabel(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function quarterIndex(quarter: QuarterlyFormCsvInput['quarter']): number {
  return Number(quarter.slice(1)) - 1;
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  const safeText = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
}
