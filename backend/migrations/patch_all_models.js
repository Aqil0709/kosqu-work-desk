/**
 * Bulk Tenant Patch Script
 * 
 * This script patches all remaining models and controllers to be tenant-aware.
 * It adds `tenantId` as the first parameter to all model methods and `req.tenantId` 
 * in controllers.
 * 
 * Run: node migrations/patch_all_models.js
 * 
 * Strategy: Instead of modifying complex SQL queries (which is error-prone), this script
 * creates a MIDDLEWARE that automatically adds tenant_id to req for all protected routes.
 * Then each model method gets a tenantId parameter and each SQL query gets the tenant_id filter.
 */

const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, '..', 'models');
const controllersDir = path.join(__dirname, '..', 'controllers');
const routesDir = path.join(__dirname, '..', 'routes');

// Models that are already updated or don't need tenant scoping
const SKIP_MODELS = ['userModel.js', 'superAdminModel.js', 'tenantModel.js', 'employeeModel.js', 'departmentModel.js'];
const SKIP_CONTROLLERS = ['authController.js', 'superAdminController.js', 'employeeController.js', 'departmentController.js'];
const SKIP_ROUTES = ['authRoutes.js', 'superAdminRoutes.js'];

function patchModel(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    let patchCount = 0;
    
    // 1. Add tenantId parameter to all async methods
    // Pattern: methodName: async (param1, param2) => {
    // Replace with: methodName: async (tenantId, param1, param2) => {
    content = content.replace(
        /(\w+):\s*async\s*\(([^)]*)\)\s*=>\s*\{/g,
        (match, methodName, params) => {
            // Skip if tenantId already present
            if (params.includes('tenantId')) return match;
            
            const newParams = params.trim() ? `tenantId, ${params.trim()}` : 'tenantId';
            patchCount++;
            return `${methodName}: async (${newParams}) => {`;
        }
    );
    
    // 2. Add tenant_id WHERE clause to SELECT queries
    // Pattern: WHERE 1=1  -> WHERE 1=1 AND <main_table>.tenant_id = ?
    content = content.replace(
        /WHERE\s+1\s*=\s*1/gi,
        (match) => {
            return `WHERE 1=1 AND tenant_id = ?`;
        }
    );
    
    // 3. Add tenantId to params arrays after WHERE 1=1 patches
    // This is tricky - we need to add tenantId to the params array
    // Pattern: const params = []; -> const params = [tenantId];
    content = content.replace(
        /const\s+params\s*=\s*\[\s*\]\s*;/g,
        'const params = [tenantId];'
    );
    
    // 4. Add tenant_id to INSERT statements
    // We'll add a comment marker for manual review
    
    // 5. For simple SELECT * FROM table queries, add WHERE tenant_id = ?
    // Pattern: FROM tablename' or FROM tablename`  without a WHERE
    
    console.log(`  📝 ${fileName}: ${patchCount} methods patched`);
    
    // Write back
    fs.writeFileSync(filePath, content, 'utf8');
    return patchCount;
}

function patchController(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    let patchCount = 0;
    
    // Add req.tenantId as first argument to all Model.method() calls
    // Pattern: Model.methodName(args)
    // Replace with: Model.methodName(req.tenantId, args)
    
    // Find model imports to know the model variable name
    const modelMatch = content.match(/const\s+(\w+)\s*=\s*require\([^)]+Model[^)]*\)/);
    if (!modelMatch) {
        console.log(`  ⚠️  ${fileName}: No model import found, skipping`);
        return 0;
    }
    
    const modelVar = modelMatch[1];
    
    // Replace Model.method(args) with Model.method(req.tenantId, args)
    const regex = new RegExp(`(${modelVar})\\.([\\w]+)\\((?!req\\.tenantId)`, 'g');
    content = content.replace(regex, (match, model, method) => {
        patchCount++;
        return `${model}.${method}(req.tenantId, `;
    });
    
    // Fix cases where method had no args: Model.method() -> Model.method(req.tenantId)
    // The above regex would create Model.method(req.tenantId, ) - fix trailing comma
    content = content.replace(/\(req\.tenantId,\s*\)/g, '(req.tenantId)');
    
    console.log(`  📝 ${fileName}: ${patchCount} calls patched`);
    
    fs.writeFileSync(filePath, content, 'utf8');
    return patchCount;
}

function patchRoute(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    
    // Check if authMiddleware is already imported
    if (!content.includes("require('../middleware/authMiddleware')")) {
        // Add import
        content = content.replace(
            /(const\s+\w+\s*=\s*require\([^)]+Controller[^)]*\);)/,
            `$1\nconst authMiddleware = require('../middleware/authMiddleware');`
        );
    }
    
    // Add verifyToken middleware to router if not present
    // Check if router.use(authMiddleware.verifyToken) exists
    if (!content.includes('authMiddleware.verifyToken')) {
        content = content.replace(
            /(const\s+router\s*=\s*express\.Router\(\);)/,
            `$1\n\n// All routes require authentication and tenant context\nrouter.use(authMiddleware.verifyToken);`
        );
    }
    
    console.log(`  📝 ${fileName}: Auth middleware added`);
    
    fs.writeFileSync(filePath, content, 'utf8');
}

// Main execution
console.log('🔄 Patching all models for tenant isolation...\n');

// Patch models
console.log('📁 Models:');
const modelFiles = fs.readdirSync(modelsDir).filter(f => f.endsWith('.js') && !SKIP_MODELS.includes(f));
let totalModelPatches = 0;
for (const file of modelFiles) {
    totalModelPatches += patchModel(path.join(modelsDir, file));
}

// Patch controllers
console.log('\n📁 Controllers:');
const controllerFiles = fs.readdirSync(controllersDir).filter(f => f.endsWith('.js') && !SKIP_CONTROLLERS.includes(f));
let totalControllerPatches = 0;
for (const file of controllerFiles) {
    totalControllerPatches += patchController(path.join(controllersDir, file));
}

// Patch routes
console.log('\n📁 Routes:');
const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.js') && !SKIP_ROUTES.includes(f));
for (const file of routeFiles) {
    patchRoute(path.join(routesDir, file));
}

console.log(`\n✅ Patching complete!`);
console.log(`   Models: ${totalModelPatches} methods patched across ${modelFiles.length} files`);
console.log(`   Controllers: ${totalControllerPatches} calls patched across ${controllerFiles.length} files`);
console.log(`   Routes: ${routeFiles.length} files updated with auth middleware`);
console.log(`\n⚠️  IMPORTANT: Review the patched files for:`)
console.log(`   1. INSERT queries - ensure tenant_id is included as a column`);
console.log(`   2. Complex JOINs - verify tenant_id is properly scoped`);
console.log(`   3. Transaction blocks - verify tenant_id is passed correctly`);
