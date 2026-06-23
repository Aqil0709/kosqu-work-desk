// migrations/run_migration.js
// Run: node migrations/run_migration.js
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function runMigration() {
    let connection;
    try {
        console.log('🔄 Connecting to database...');
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT,
            multipleStatements: true
        });

        console.log('✅ Connected to database');

        // Read migration SQL
        const migrationSQL = fs.readFileSync(
            path.join(__dirname, 'tenant_migration.sql'),
            'utf8'
        );

        console.log('🔄 Running tenant migration...');
        
        // Split by semicolons, strip comment-only lines from each statement
        const statements = migrationSQL
            .split(';')
            .map(s => {
                // Remove comment-only lines but keep actual SQL lines
                return s.split('\n')
                    .filter(line => !line.trim().startsWith('--'))
                    .join('\n')
                    .trim();
            })
            .filter(s => s.length > 0);

        let successCount = 0;
        let skipCount = 0;

        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i];
            if (stmt.length < 5) continue;
            
            try {
                await connection.execute(stmt);
                successCount++;
                // Log progress every 10 statements
                if (successCount % 10 === 0) {
                    console.log(`   Progress: ${successCount} statements executed...`);
                }
            } catch (error) {
                // Skip if column/table/index already exists (idempotent)
                if (error.code === 'ER_DUP_FIELDNAME' || 
                    error.code === 'ER_TABLE_EXISTS_ERROR' ||
                    error.code === 'ER_DUP_ENTRY' ||
                    error.code === 'ER_DUP_KEYNAME' ||
                    error.code === 'ER_FK_DUP_NAME' ||
                    error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
                    skipCount++;
                    console.log(`   ⚠️ Skipped (already exists): ${stmt.substring(0, 60)}...`);
                } else {
                    console.error(`   ❌ Error on statement: ${stmt.substring(0, 80)}...`);
                    console.error(`      Code: ${error.code}`);
                    console.error(`      ${error.message}`);
                    throw error;
                }
            }
        }

        console.log(`✅ Tenant migration completed! (${successCount} executed, ${skipCount} skipped)`);

        // Create default super admin
        console.log('🔄 Creating default super admin...');
        const superAdminEmail = 'superadmin@workdesk.com';
        const superAdminPassword = 'SuperAdmin@123';
        const passwordHash = await bcrypt.hash(superAdminPassword, 10);

        try {
            await connection.execute(
                `INSERT INTO super_admins (first_name, last_name, email, password_hash) 
                 VALUES (?, ?, ?, ?)`,
                ['Super', 'Admin', superAdminEmail, passwordHash]
            );
            console.log('✅ Super admin created!');
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                console.log('   ⚠️ Super admin already exists, skipping...');
            } else {
                throw error;
            }
        }

        console.log('\n🎉 Migration completed successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Default Super Admin Credentials:');
        console.log(`  Email:    ${superAdminEmail}`);
        console.log(`  Password: ${superAdminPassword}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        if (connection) await connection.end();
    }
}

runMigration();
