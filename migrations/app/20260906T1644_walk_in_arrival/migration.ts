#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/11f9e4f973d04accb96a4060c2717d7f9246a489cd71734e7e62df7f280d86fa/contract';
import startContract from '../../snapshots/11f9e4f973d04accb96a4060c2717d7f9246a489cd71734e7e62df7f280d86fa/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/142b1021ecbc1dc68d2d50077fcab5a38ca3be6580f2614641a2b9c725a0c2bf/contract';
import endContract from '../../snapshots/142b1021ecbc1dc68d2d50077fcab5a38ca3be6580f2614641a2b9c725a0c2bf/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Appointment',
        column: col('arrivedAt', 'timestamp(3)', {
          codecRef: { codecId: 'pg/timestamp-string@1', typeParams: { precision: 3 } },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
