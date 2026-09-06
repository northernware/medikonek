#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/7309f079d5104d2cfb494e06e14c294e90df397fe2091da54c63ee6924505dba/contract';
import startContract from '../../snapshots/7309f079d5104d2cfb494e06e14c294e90df397fe2091da54c63ee6924505dba/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/f8b2427599ef891964c651e14b1e878de23e422963a287b4cb0b736b680357c5/contract';
import endContract from '../../snapshots/f8b2427599ef891964c651e14b1e878de23e422963a287b4cb0b736b680357c5/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'PatientNumberCounter',
        columns: [
          col('lastUsed', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('year', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['year'], { name: 'PatientNumberCounter_pkey' })],
      }),
      this.addColumn({
        schema: 'public',
        table: 'Patient',
        column: col('patientNumber', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'Patient',
        index: 'Patient_patientNumber_key',
        columns: ['patientNumber'],
        extras: { unique: true },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
