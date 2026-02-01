import { Connection, Keypair } from '@solana/web3.js';
import { Pool } from 'pg';
import bs58 from 'bs58';

export class KeypairService {
  constructor(
    private connection: Connection,
    private pool: Pool
  ) {}

  async getFreshKeypair(): Promise<Keypair> {
    const MAX_ATTEMPTS = 10;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const client = await this.pool.connect();

      try {
        await client.query('BEGIN');

        const res = await client.query(
          `UPDATE keys
           SET used = TRUE
           WHERE id = (
             SELECT id FROM keys
             WHERE used = FALSE
             LIMIT 1
             FOR UPDATE SKIP LOCKED
           )
           RETURNING private_key, public_key`
        );

        await client.query('COMMIT');

        if (res.rowCount === 0) {
          continue;
        }

        const { private_key } = res.rows[0];
        const secretKey = bs58.decode(private_key);
        const keypair = Keypair.fromSecretKey(secretKey);

        const acctInfo = await this.connection.getAccountInfo(keypair.publicKey);
        if (!acctInfo) {
          return keypair;
        }
      } catch (err) {
        console.error(`❌ DB error on attempt ${attempt + 1}:`, err);
        try {
          await client.query('ROLLBACK');
        } catch (rollbackErr) {
          console.error('Failed to rollback transaction:', rollbackErr);
        }
      } finally {
        client.release();
      }
    }

    return Keypair.generate();
  }
}
