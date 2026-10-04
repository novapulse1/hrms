// ====================================================================
// NovaPulse / MakeMyPayroll — Client Module Access Verification Suite
// Tests Super Admin manual module management, tenant isolation, and Task Management
// ====================================================================

import { TenantService } from '../services/tenantService';
import { PlanService } from '../services/planService';
import { TenantHostService } from '../services/tenantHostService';
import { StorageEngine, STORAGE_KEYS } from '../database/storageEngine';
import { Tenant } from '../database/schema';

// Initialize storage engine
StorageEngine.init();

console.log('====================================================');
console.log('CLIENT MODULE ACCESS MANAGEMENT VERIFICATION SUITE');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    console.log(`[PASS] Test ${totalTests}: ${testName}`);
    if (details) console.log(`       ${details}`);
    passedTests++;
  } else {
    console.error(`[FAIL] Test ${totalTests}: ${testName}`);
    if (details) console.error(`       Details: ${details}`);
    process.exitCode = 1;
  }
}

// ----------------------------------------------------
// TEST 1: Silaris Tenant Exists with Valid Configuration
// ----------------------------------------------------
const silaris = TenantService.getById('NP-000006');
assert(
  !!silaris && silaris.tenantId === 'NP-000006' && silaris.slug === 'silaris',
  'Silaris Information Technologies located with ID NP-000006',
  `Found: ${silaris?.companyName} (${silaris?.tenantId})`
);

// ----------------------------------------------------
// TEST 2: Preserved Seed Tenants Check (NP-000001 to NP-000006)
// ----------------------------------------------------
const requiredTenants = ['NP-000001', 'NP-000002', 'NP-000003', 'NP-000004', 'NP-000005', 'NP-000006'];
const allFound = requiredTenants.every(id => !!TenantService.getById(id));
assert(
  allFound,
  'All 6 core seed tenants preserved without duplication',
  `Verified: ${requiredTenants.join(', ')}`
);

// ----------------------------------------------------
// TEST 3: Super Admin Can Update Enabled Modules for Silaris
// ----------------------------------------------------
const customModules = [
  'dashboard',
  'employees',
  'attendance',
  'leaves',
  'payroll',
  'shifts',
  'tickets',
  'onboarding',
  'geolocation',
  'tasks'
];

const updateRes = TenantService.updateEnabledModules('NP-000006', customModules, 'Super Admin');
assert(
  updateRes.success && updateRes.message === 'Module access updated successfully.',
  'Super Admin successfully updates Silaris module access',
  `Message: ${updateRes.message}`
);

const updatedSilaris = TenantService.getById('NP-000006');
assert(
  !!updatedSilaris &&
  updatedSilaris.enabledModules?.includes('tasks') === true &&
  updatedSilaris.enabledModules?.includes('inventory') === false,
  'Silaris has Task Management ENABLED and Inventory DISABLED',
  `Enabled Modules: ${updatedSilaris?.enabledModules?.join(', ')}`
);

// ----------------------------------------------------
// TEST 4: PlanService Enforces Client Module Entitlements
// ----------------------------------------------------
assert(
  PlanService.isModuleAllowedForTenant('tasks', updatedSilaris!) === true,
  'PlanService allows Task Management for Silaris',
  'tasks module allowed: true'
);

assert(
  PlanService.isModuleAllowedForTenant('inventory', updatedSilaris!) === false,
  'PlanService strictly blocks disabled Inventory module for Silaris',
  'inventory module allowed: false'
);

// ----------------------------------------------------
// TEST 5: Tenant Isolation Check
// ----------------------------------------------------
// Disabling tasks for Acme (NP-000002) should NOT affect Silaris (NP-000006)
TenantService.updateEnabledModules('NP-000002', ['dashboard', 'employees', 'attendance', 'payroll'], 'Super Admin');

const acme = TenantService.getById('NP-000002');
const silarisCheck = TenantService.getById('NP-000006');

assert(
  PlanService.isModuleAllowedForTenant('tasks', acme!) === false &&
  PlanService.isModuleAllowedForTenant('tasks', silarisCheck!) === true,
  'Cross-tenant module isolation: Task Management disabled for Acme, enabled for Silaris',
  `Acme has tasks: ${PlanService.isModuleAllowedForTenant('tasks', acme!)}, Silaris has tasks: ${PlanService.isModuleAllowedForTenant('tasks', silarisCheck!)}`
);

// ----------------------------------------------------
// TEST 6: Subdomain and Legacy Resolution
// ----------------------------------------------------
const silarisHost = TenantHostService.resolve('silaris.makemypayroll.com');
assert(
  silarisHost.mode === 'tenant' && silarisHost.tenantId === 'NP-000006',
  'https://silaris.makemypayroll.com resolves to NP-000006',
  `Mode: ${silarisHost.mode}, Tenant ID: ${silarisHost.tenantId}`
);

const legacyHost = TenantHostService.resolve('makemypayroll.com', '/t/NP-000001');
assert(
  legacyHost.mode === 'legacy' && legacyHost.tenantId === 'NP-000001',
  'Legacy route /t/NP-000001 resolves to NP-000001',
  `Mode: ${legacyHost.mode}, Tenant ID: ${legacyHost.tenantId}`
);

// ----------------------------------------------------
// TEST 7: NovaPulse (NP-000001) Custom 4-Module Persistence Across Re-init/Reload
// ----------------------------------------------------
const novaPulse4Modules = ['dashboard', 'employees', 'attendance', 'leaves'];
const updateResNP = TenantService.updateEnabledModules('NP-000001', novaPulse4Modules, 'Super Admin');
assert(
  updateResNP.success,
  'Super Admin successfully configures NovaPulse (NP-000001) with exactly 4 modules',
  `Configured modules: ${novaPulse4Modules.join(', ')}`
);

// Simulate page reload / application startup
(StorageEngine as any).initialized = false;
StorageEngine.init();

const reloadedNP = TenantService.getById('NP-000001');
assert(
  !!reloadedNP &&
  Array.isArray(reloadedNP.enabledModules) &&
  reloadedNP.enabledModules.length === 4 &&
  novaPulse4Modules.every(m => reloadedNP.enabledModules!.includes(m)) &&
  !reloadedNP.enabledModules.includes('shifts') &&
  !reloadedNP.enabledModules.includes('payroll') &&
  !reloadedNP.enabledModules.includes('tasks'),
  'NovaPulse 4-module configuration persists across reload without being overwritten by seed defaults',
  `Reloaded Modules: ${reloadedNP?.enabledModules?.join(', ')}`
);

// ----------------------------------------------------
// TEST 8: PlanService Enforces Exact 4-Module Entitlement for NovaPulse
// ----------------------------------------------------
assert(
  PlanService.isModuleAllowedForTenant('dashboard', reloadedNP!) === true &&
  PlanService.isModuleAllowedForTenant('employees', reloadedNP!) === true &&
  PlanService.isModuleAllowedForTenant('attendance', reloadedNP!) === true &&
  PlanService.isModuleAllowedForTenant('leaves', reloadedNP!) === true &&
  PlanService.isModuleAllowedForTenant('shifts', reloadedNP!) === false &&
  PlanService.isModuleAllowedForTenant('payroll', reloadedNP!) === false &&
  PlanService.isModuleAllowedForTenant('tasks', reloadedNP!) === false &&
  PlanService.isModuleAllowedForTenant('inventory', reloadedNP!) === false,
  'PlanService strictly allows only the 4 configured modules for NovaPulse and denies unselected modules',
  'Dashboard, Employees, Attendance, Leaves allowed; Shifts, Payroll, Tasks, Inventory blocked'
);

// Restore full modules for Silaris and NovaPulse
TenantService.updateEnabledModules('NP-000006', [
  'dashboard',
  'shifts',
  'attendance',
  'leaves',
  'employees',
  'tickets',
  'onboarding',
  'inventory',
  'geolocation',
  'payroll',
  'tasks',
  'settings'
], 'Super Admin');

TenantService.updateEnabledModules('NP-000001', [
  'dashboard',
  'shifts',
  'attendance',
  'leaves',
  'employees',
  'tickets',
  'onboarding',
  'inventory',
  'geolocation',
  'payroll',
  'tasks',
  'settings'
], 'Super Admin');

console.log('\n====================================================');
console.log(`TEST RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
console.log('====================================================');
