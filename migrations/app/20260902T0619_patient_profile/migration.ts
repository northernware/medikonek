#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/3bedda52fae42a9f58e88ab741db14d8f792592825b421df63901d0e1300b14b/contract';
import startContract from '../../snapshots/3bedda52fae42a9f58e88ab741db14d8f792592825b421df63901d0e1300b14b/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/a6c2e9f7ac0a657c8c9685a75b11eaf2bdb7eea2b9ab55e84ae7b70ae444bd64/contract';
import endContract from '../../snapshots/a6c2e9f7ac0a657c8c9685a75b11eaf2bdb7eea2b9ab55e84ae7b70ae444bd64/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'PatientAlert',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('label', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('patientId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'PatientAlert_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'PatientMedication',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
          }),
          col('dosage', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('frequency', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('label', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('patientId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'PatientMedication_pkey' })],
      }),
      this.addColumn({
        schema: 'public',
        table: 'Household',
        column: col('primaryContactId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Patient',
        column: col('emergencyContactName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Patient',
        column: col('emergencyContactNumber', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Patient',
        column: col('emergencyContactRelationship', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Patient',
        column: col('medicationStatus', '"ClinicalListStatus"', {
          notNull: true,
          default: lit('UNKNOWN'),
          codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'ClinicalListStatus' } },
        }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'Household',
        index: 'Household_primaryContactId_key',
        columns: ['primaryContactId'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'PatientAlert',
        index: 'PatientAlert_patientId_idx',
        columns: ['patientId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PatientAlert',
        index: 'PatientAlert_patientId_label_key',
        columns: ['patientId', 'label'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'PatientMedication',
        index: 'PatientMedication_patientId_idx',
        columns: ['patientId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PatientMedication',
        index: 'PatientMedication_patientId_label_key',
        columns: ['patientId', 'label'],
        extras: { unique: true },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Household',
        foreignKey: {
          name: 'Household_primaryContactId_fkey',
          columns: ['primaryContactId'],
          references: { schema: 'public', table: 'Patient', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PatientAlert',
        foreignKey: {
          name: 'PatientAlert_patientId_fkey',
          columns: ['patientId'],
          references: { schema: 'public', table: 'Patient', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PatientMedication',
        foreignKey: {
          name: 'PatientMedication_patientId_fkey',
          columns: ['patientId'],
          references: { schema: 'public', table: 'Patient', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
