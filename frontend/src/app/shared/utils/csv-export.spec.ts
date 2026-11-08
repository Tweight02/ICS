import { describe, expect, it } from 'vitest';
import {
  buildStyledQuarterlyWorkbook,
  buildQuarterlyFormCsvItems,
  buildQuarterlyFormCsvRows,
  csvFilenamePart,
  serializeCsv
} from './csv-export';

describe('CSV export utilities', () => {
  it('quotes cells, escapes quotes, and prevents formula execution', () => {
    expect(serializeCsv([
      ['Department', 'Name, Inc.', 'A "quoted" value'],
      ['=SUM(A1:A2)', '  @command', null]
    ])).toBe(
      '"Department","Name, Inc.","A ""quoted"" value"\r\n' +
      '"\'=SUM(A1:A2)","\'  @command",""'
    );
  });

  it('creates a safe filename segment', () => {
    expect(csvFilenamePart('Youth Ministries & Outreach')).toBe('youth-ministries-outreach');
    expect(csvFilenamePart('')).toBe('report');
  });

  it('uses the children ministry headings, quarter values, and total without event metrics', () => {
    const rows = buildQuarterlyFormCsvRows({
      departmentId: 13,
      departmentName: 'Children and Family Ministries',
      programName: 'Children and Family Ministries Quarterly Report',
      churchName: 'Sample Church',
      districtName: 'North District',
      districtPastorName: 'Assigned Pastor',
      year: 2026,
      quarter: 'Q3',
      items: [{
        section: "CHILDREN'S MINISTRIES",
        particular: 'Number of children in the congregation under age 15',
        value: 18,
        quarterValues: { Q1: 10, Q2: 12, Q3: 18, Q4: '' },
        total: 40
      }]
    });

    expect(rows[0]).toEqual(['NORTHERN LUZON PHILIPPINE UNION MISSION']);
    expect(rows[1]).toEqual(["CHILDREN'S MINISTRIES DEPARTMENT"]);
    expect(rows[4]).toEqual([
      'Name of District Pastor:',
      'Assigned Pastor',
      'District:',
      'North District'
    ]);
    expect(rows[5]).toEqual(['Church:', 'Sample Church', 'Quarter:', 'Q3']);
    expect(serializeCsv(rows.slice(4, 6))).toBe(
      '"Name of District Pastor:","Assigned Pastor","District:","North District"\r\n' +
      '"Church:","Sample Church","Quarter:","Q3"'
    );
    expect(rows[7]).toEqual([
      '',
      'PARTICULAR',
      '1ST QTR',
      '2ND QTR',
      '3RD QTR',
      '4TH QTR',
      'TOTAL'
    ]);
    expect(rows[9]).toEqual([
      1,
      'Number of children in the congregation under age 15',
      10,
      12,
      18,
      '',
      40
    ]);
    expect(rows.flat().map(String)).not.toContain('Completed Events');
    expect(rows.flat().map(String)).not.toContain('Participants');
  });

  it('lists AY quarterly statistics particulars and values vertically', () => {
    const rows = buildQuarterlyFormCsvRows({
      departmentId: 17,
      departmentName: 'Youth Ministries',
      programName: 'AY Quarterly Statistics',
      churchName: 'Sample Church',
      districtName: 'North District',
      year: 2026,
      quarter: 'Q3',
      items: [
        { section: '', particular: 'MG Clubs', value: 6 },
        { section: '', particular: 'MG Memberships', value: 120 }
      ]
    });

    expect(rows[7]).toEqual(['PARTICULAR', 'Q3']);
    expect(rows[8]).toEqual(['MG Clubs', 6]);
    expect(rows[9]).toEqual(['MG Memberships', 120]);
  });

  it('creates a formatted Excel worksheet with merged report title and styled table', async () => {
    const rows = buildQuarterlyFormCsvRows({
      departmentId: 13,
      departmentName: 'Children and Family Ministries',
      programName: 'Children and Family Ministries Quarterly Report',
      churchName: 'Sample Church',
      districtName: 'North District',
      districtPastorName: 'Assigned Pastor',
      year: 2026,
      quarter: 'Q3',
      items: [{
        section: "CHILDREN'S MINISTRIES",
        particular: 'Children served',
        value: 18,
        quarterValues: { Q1: 10, Q2: 12, Q3: 18, Q4: '' },
        total: 40
      }]
    });

    const workbook = await buildStyledQuarterlyWorkbook(rows);
    const worksheet = workbook.getWorksheet('Quarterly Report');

    expect(worksheet?.getCell('A1').value).toBe('NORTHERN LUZON PHILIPPINE UNION MISSION');
    expect(worksheet?.getCell('A1').font.bold).toBe(true);
    expect(worksheet?.getCell('A1').isMerged).toBe(true);
    expect(worksheet?.getCell('A8').fill).toMatchObject({
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF176B52' }
    });
    expect(worksheet?.getCell('H8').fill).toBeUndefined();
    expect(worksheet?.getCell('A5').value).toBe('Name of District Pastor:');
    expect(worksheet?.getCell('B5').value).toBe('Assigned Pastor');
    expect(worksheet?.getCell('A5').isMerged).toBe(false);
    expect(worksheet?.getCell('A6').value).toBe('Church:');
    expect(worksheet?.getCell('B6').value).toBe('Sample Church');
    expect(worksheet?.getColumn(2).width).toBe(56);
    expect(worksheet?.pageSetup.orientation).toBe('landscape');
  });

  it('styles the heading row in summary workbook exports', async () => {
    const workbook = await buildStyledQuarterlyWorkbook([
      ['Report summary', 'Youth Ministries'],
      ['Year', 2026],
      [],
      ['Type', 'Department', 'Report', 'Particular'],
      ['Department', 'Youth Ministries', '', '']
    ]);
    const worksheet = workbook.getWorksheet('Quarterly Report');

    expect(worksheet?.getCell('A4').fill).toMatchObject({
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF176B52' }
    });
    expect(worksheet?.getCell('A5').value).toBe('Department');
  });

  it('collects values from all quarters for the requested year', () => {
    const [item] = buildQuarterlyFormCsvItems([{
      program_name: "CHILDREN'S MINISTRIES",
      particulars: [{
        particular_name: 'Children served',
        quarters: [
          { quarter: 'Q1', year: 2026, value: 10 },
          { quarter: 'Q2', year: 2026, value: 15 },
          { quarter: 'Q3', year: 2026, value: 20 },
          { quarter: 'Q4', year: 2025, value: 99 }
        ]
      }]
    }], 2026, 'Q3');

    expect(item.quarterValues).toEqual({ Q1: 10, Q2: 15, Q3: 20, Q4: '' });
    expect(item.value).toBe(20);
    expect(item.total).toBe(45);
  });

  it('uses church columns and quarter months for the stewardship form', () => {
    const rows = buildQuarterlyFormCsvRows({
      departmentId: 14,
      departmentName: 'Stewardship Ministries',
      programName: 'Stewardship Quarterly Report',
      churchName: 'Sample Church',
      districtName: 'North District',
      year: 2026,
      quarter: 'Q3',
      months: ['July', 'August', 'September'],
      items: [
        { section: 'STEWARDSHIP', particular: 'No. of Church Members', value: 40 },
        {
          section: 'OFFERING AND TITHES',
          particular: 'Offering',
          value: 300,
          monthlyValues: { July: 100, August: 100, September: 100 }
        }
      ]
    });

    expect(rows[7][0]).toBe('CHURCH');
    expect(rows[7]).toContain('Offering July');
    expect(rows[8][0]).toBe('Sample Church');
    expect(rows[8][1]).toBe(40);
    expect(rows[8].slice(-6)).toEqual([100, 100, 100, '', '', '']);
  });

  it('exports Secretariat data in the template column layout', () => {
    const rows = buildQuarterlyFormCsvRows({
      departmentId: 21,
      departmentName: 'Secretariat',
      programName: 'Secretariat Quarterly Report',
      churchName: 'Sample Church',
      districtName: 'North District',
      year: 2026,
      quarter: 'Q2',
      items: [{
        section: 'CHURCH STATISTICS',
        particular: 'Church Attendance Second Sabbath Count',
        value: 72
      }]
    });

    expect(rows[7]).toContain('Church Attendance Second Sabbath Count');
    expect(rows[8][0]).toBe('Sample Church');
    expect(rows[8][1]).toBe('Q2');
    expect(rows[8][4]).toBe(72);
  });
});
