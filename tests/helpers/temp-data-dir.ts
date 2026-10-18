// Importe antes de app/lib/db.ts: aponta o banco para uma pasta temporaria do teste.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'mandapixel-test-'));
