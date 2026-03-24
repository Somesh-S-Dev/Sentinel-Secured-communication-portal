import { Component, Input, OnChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector:   'snt-avatar',
  standalone: true,
  imports:    [CommonModule],
  template: `
    <div class="avatar" [class.is-admin]="isAdmin" [style]="avatarStyle()">
      <span class="avatar-text">{{ label() }}</span>
    </div>
  `,
  styles: [`
    .avatar {
      width: 34px; height: 34px; border-radius: 9px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      font-family: var(--font-mono);
      font-size: 12px; font-weight: 500;
      border: 1px solid rgba(255,255,255,.06);
    }
    .avatar.is-admin {
      border-radius: 10px;
      border: 1px solid rgba(59,125,232,.3);
    }
    .avatar-text { line-height: 1; }
  `],
})
export class AvatarComponent implements OnChanges {
  @Input() seed    = '';
  @Input() isAdmin = false;
  @Input() role?   = '';

  avatarStyle = signal('');
  label       = signal('');

  private readonly PALETTES = [
    { bg: 'rgba(59,125,232,.18)',  color: '#7baaf0' },
    { bg: 'rgba(30,184,160,.15)',  color: '#1eb8a0' },
    { bg: 'rgba(232,169,59,.13)',  color: '#e8b870' },
    { bg: 'rgba(90,190,120,.13)',  color: '#5ab875' },
    { bg: 'rgba(190,90,90,.13)',   color: '#e07070' },
    { bg: 'rgba(180,90,220,.12)',  color: '#b8a4e8' },
    { bg: 'rgba(90,180,220,.12)',  color: '#70c8d8' },
    { bg: 'rgba(220,130,90,.13)',  color: '#e8b870' },
  ];

  ngOnChanges() {
    if (this.isAdmin) {
      this.avatarStyle.set(`background: rgba(59,125,232,.15); color: var(--accent);`);
      const initials = (this.role ?? 'AD').replace(/_/g, ' ')
        .split(' ').map(w => w[0]).join('').slice(0, 2);
      this.label.set(initials);
      return;
    }

    // Deterministic color from seed
    let hash = 0;
    for (let i = 0; i < this.seed.length; i++) {
      hash = ((hash << 5) - hash) + this.seed.charCodeAt(i);
      hash |= 0;
    }
    const palette = this.PALETTES[Math.abs(hash) % this.PALETTES.length];
    this.avatarStyle.set(`background: ${palette.bg}; color: ${palette.color};`);

    // Label: first letter of seed
    this.label.set((this.seed[0] ?? '?').toUpperCase());
  }
}
