import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',  loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'cases',      loadComponent: () => import('./cases/cases.component').then(m => m.CasesComponent) },
      { path: 'cases/:id',  loadComponent: () => import('./case-detail/case-detail.component').then(m => m.CaseDetailComponent) },
      { path: 'audit-logs', loadComponent: () => import('./audit-logs/audit-logs.component').then(m => m.AuditLogsComponent) },
      { path: 'team',       loadComponent: () => import('./admin-management/admin-management.component').then(m => m.AdminManagementComponent) },
    ],
  },
];
