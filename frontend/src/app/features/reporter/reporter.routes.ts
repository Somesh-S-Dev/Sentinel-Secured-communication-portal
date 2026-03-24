import { Routes } from '@angular/router';

export const REPORTER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/reporter-layout.component').then(m => m.ReporterLayoutComponent),
    children: [
      { path: '', redirectTo: 'channels', pathMatch: 'full' },
      {
        path: 'channels',
        loadComponent: () => import('./channels/channels.component').then(m => m.ChannelsComponent),
      },
      {
        path: 'channels/:channelId',
        loadComponent: () => import('./chat/chat.component').then(m => m.ChatComponent),
      },
      {
        path: 'my-reports',
        loadComponent: () => import('./my-reports/my-reports.component').then(m => m.MyReportsComponent),
      },
    ],
  },
];
