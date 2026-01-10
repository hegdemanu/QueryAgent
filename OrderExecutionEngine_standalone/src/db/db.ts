import { Pool } from 'pg';
import { config } from '../config';

const pool = new Pool({
    connectionString: config.DATABASE_URL,
});

export const query = async <T = unknown>(text: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number }> => {
    const result = await pool.query(text, params);
    return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
};

export async function checkConnection(): Promise<boolean> {
    try {
        await pool.query('SELECT 1');
        return true;
    } catch (error) {
        console.error('Database connection failed:', error);
        return false;
    }
}

export default pool;
