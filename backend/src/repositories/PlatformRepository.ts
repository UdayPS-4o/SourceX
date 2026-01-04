export { };
const { query, execute } = require('../config/database') as typeof import('../config/database');

export interface Platform {
    id: number;
    name: string;
    baseUrl: string | null;
    lastSyncStart: Date | null;
    lastSyncEnd: Date | null;
    syncStatus: 'idle' | 'running' | 'failed';
}

export interface PlatformRow {
    id: number;
    name: string;
    base_url: string | null;
    last_sync_start: Date | null;
    last_sync_end: Date | null;
    sync_status: 'idle' | 'running' | 'failed';
}

export class PlatformRepository {

    /**
     * Get all platforms
     */
    async getAll(): Promise<Platform[]> {
        const rows = await query<PlatformRow[]>(
            'SELECT * FROM platforms ORDER BY name'
        );
        return rows.map(this.mapRow);
    }

    /**
     * Get platform by ID
     */
    async getById(id: number): Promise<Platform | null> {
        const rows = await query<PlatformRow[]>(
            'SELECT * FROM platforms WHERE id = ?',
            [id]
        );
        return rows.length > 0 ? this.mapRow(rows[0]) : null;
    }

    /**
     * Get platform by name
     */
    async getByName(name: string): Promise<Platform | null> {
        const rows = await query<PlatformRow[]>(
            'SELECT * FROM platforms WHERE name = ?',
            [name]
        );
        return rows.length > 0 ? this.mapRow(rows[0]) : null;
    }

    /**
     * Create or get platform by name
     */
    async getOrCreate(name: string, baseUrl?: string): Promise<Platform> {
        let platform = await this.getByName(name);
        if (!platform) {
            const result = await execute(
                'INSERT INTO platforms (name, base_url, sync_status) VALUES (?, ?, ?)',
                [name, baseUrl || null, 'idle']
            );
            platform = await this.getById((result as any).insertId);
        }
        return platform!;
    }

    /**
     * Start sync - mark platform as running
     */
    async startSync(platformId: number): Promise<void> {
        await execute(
            'UPDATE platforms SET sync_status = ?, last_sync_start = NOW() WHERE id = ?',
            ['running', platformId]
        );
    }

    /**
     * End sync - mark platform as completed or failed
     */
    async endSync(platformId: number, status: 'idle' | 'failed'): Promise<void> {
        await execute(
            'UPDATE platforms SET sync_status = ?, last_sync_end = NOW() WHERE id = ?',
            [status, platformId]
        );
    }

    /**
     * Map database row to Platform interface
     */
    private mapRow(row: PlatformRow): Platform {
        return {
            id: row.id,
            name: row.name,
            baseUrl: row.base_url,
            lastSyncStart: row.last_sync_start,
            lastSyncEnd: row.last_sync_end,
            syncStatus: row.sync_status,
        };
    }
}

export const platformRepository = new PlatformRepository();
