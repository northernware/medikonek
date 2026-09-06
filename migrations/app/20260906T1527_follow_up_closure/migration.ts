#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/7309f079d5104d2cfb494e06e14c294e90df397fe2091da54c63ee6924505dba/contract';
import endContract from '../../snapshots/7309f079d5104d2cfb494e06e14c294e90df397fe2091da54c63ee6924505dba/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/a6c2e9f7ac0a657c8c9685a75b11eaf2bdb7eea2b9ab55e84ae7b70ae444bd64/contract';
import startContract from '../../snapshots/a6c2e9f7ac0a657c8c9685a75b11eaf2bdb7eea2b9ab55e84ae7b70ae444bd64/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'MedicalRecord',
        column: col('followUpClosedAt', 'timestamp(3)', {
          codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'MedicalRecord',
        column: col('followUpClosedById', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'MedicalRecord',
        column: col('followUpClosedReason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'MedicalRecord',
        index: 'MedicalRecord_followUpClosedById_idx',
        columns: ['followUpClosedById'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'MedicalRecord',
        foreignKey: {
          name: 'MedicalRecord_followUpClosedById_fkey',
          columns: ['followUpClosedById'],
          references: { schema: 'public', table: 'Doctor', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
