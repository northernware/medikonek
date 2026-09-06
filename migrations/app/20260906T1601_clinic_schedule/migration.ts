#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/11f9e4f973d04accb96a4060c2717d7f9246a489cd71734e7e62df7f280d86fa/contract';
import endContract from '../../snapshots/11f9e4f973d04accb96a4060c2717d7f9246a489cd71734e7e62df7f280d86fa/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/f8b2427599ef891964c651e14b1e878de23e422963a287b4cb0b736b680357c5/contract';
import startContract from '../../snapshots/f8b2427599ef891964c651e14b1e878de23e422963a287b4cb0b736b680357c5/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'ClinicBreak',
        columns: [
          col('doctorId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('endMinute', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('label', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('startMinute', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('weekday', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'ClinicBreak_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'ClinicClosure',
        columns: [
          col('doctorId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('endMinute', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('endsOn', 'date', { notNull: true, codecRef: { codecId: 'pg/date-string@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('reason', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('startMinute', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('startsOn', 'date', { notNull: true, codecRef: { codecId: 'pg/date-string@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'ClinicClosure_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'ClinicHours',
        columns: [
          col('closeMinute', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('doctorId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('openMinute', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('weekday', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'ClinicHours_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'ScheduleSettings',
        columns: [
          col('defaultDurationMinutes', 'int4', {
            notNull: true,
            default: lit(30),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('doctorId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('maxLeadDays', 'int4', {
            notNull: true,
            default: lit(180),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('minLeadMinutes', 'int4', {
            notNull: true,
            default: lit(1440),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('slotStepMinutes', 'int4', {
            notNull: true,
            default: lit(15),
            codecRef: { codecId: 'pg/int4@1' },
          }),
        ],
        constraints: [primaryKey(['doctorId'], { name: 'ScheduleSettings_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'ServiceDuration',
        columns: [
          col('doctorId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('minutes', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('service', '"ServiceType"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'ServiceType' } },
          }),
        ],
        constraints: [primaryKey(['id'], { name: 'ServiceDuration_pkey' })],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ClinicBreak',
        index: 'ClinicBreak_doctorId_idx',
        columns: ['doctorId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ClinicClosure',
        index: 'ClinicClosure_doctorId_idx_04369053',
        columns: ['doctorId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ClinicClosure',
        index: 'ClinicClosure_doctorId_startsOn_idx',
        columns: ['doctorId', 'startsOn'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ClinicHours',
        index: 'ClinicHours_doctorId_idx_04369053',
        columns: ['doctorId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ClinicHours',
        index: 'ClinicHours_doctorId_weekday_key',
        columns: ['doctorId', 'weekday'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'ServiceDuration',
        index: 'ServiceDuration_doctorId_idx_04369053',
        columns: ['doctorId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ServiceDuration',
        index: 'ServiceDuration_doctorId_service_key',
        columns: ['doctorId', 'service'],
        extras: { unique: true },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ClinicBreak',
        foreignKey: {
          name: 'ClinicBreak_doctorId_fkey',
          columns: ['doctorId'],
          references: { schema: 'public', table: 'Doctor', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ClinicClosure',
        foreignKey: {
          name: 'ClinicClosure_doctorId_fkey',
          columns: ['doctorId'],
          references: { schema: 'public', table: 'Doctor', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ClinicHours',
        foreignKey: {
          name: 'ClinicHours_doctorId_fkey',
          columns: ['doctorId'],
          references: { schema: 'public', table: 'Doctor', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ScheduleSettings',
        foreignKey: {
          name: 'ScheduleSettings_doctorId_fkey',
          columns: ['doctorId'],
          references: { schema: 'public', table: 'Doctor', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ServiceDuration',
        foreignKey: {
          name: 'ServiceDuration_doctorId_fkey',
          columns: ['doctorId'],
          references: { schema: 'public', table: 'Doctor', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
