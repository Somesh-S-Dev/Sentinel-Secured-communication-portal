import {
  Component, OnInit, OnDestroy, signal, computed,
  ViewChild, ElementRef, AfterViewChecked,
} from '@angular/core';
import { CommonModule }    from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule }   from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule }   from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule }  from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar }     from '@angular/material/snack-bar';
import { Subscription }    from 'rxjs';
import { ApiService }      from '../../../core/services/api.service';
import { WebSocketService }from '../../../core/services/websocket.service';
import { AuthService, AdminProfile } from '../../../core/services/auth.service';
import { Report, Message, CaseStatus, Severity } from '../../../core/models/report.model';
import { AvatarComponent } from '../../shared/avatar/avatar.component';

const STATUS_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  OPEN:         ['UNDER_REVIEW', 'ESCALATED', 'CLOSED'],
  UNDER_REVIEW: ['ESCALATED', 'RESOLVED', 'CLOSED'],
  ESCALATED:    ['UNDER_REVIEW', 'RESOLVED', 'CLOSED'],
  RESOLVED:     ['CLOSED'],
  CLOSED:       [],
};

@Component({
  selector:   'snt-case-detail',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule,
    MatIconModule, MatButtonModule, MatMenuModule,
    MatDialogModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatProgressSpinnerModule, AvatarComponent,
  ],
  template: `
<div class="detail-shell">

  <!-- Header -->
  <div class="detail-header">
    <a routerLink="/admin/cases" class="back-link">
      <mat-icon>arrow_back</mat-icon> Cases
    </a>

    @if (report()) {
      <div class="header-main">
        <div class="case-id-wrap">
          <span class="case-num mono">{{ report()!.caseNumber }}</span>
          <span class="sev-badge" [class]="'sev-badge sev-' + report()!.severity">
            {{ report()!.severity }}
          </span>
          <span class="status-badge" [class]="'status-badge status-' + report()!.status">
            {{ formatStatus(report()!.status) }}
          </span>
        </div>
        <div class="header-sub">
          {{ report()!.channel.displayName }} ·
          Opened {{ report()!.createdAt | date:'MMM d, yyyy HH:mm' }} ·
          {{ report()!._count.messages }} messages
        </div>
      </div>

      <!-- Actions -->
      <div class="header-actions">
        <!-- Status change -->
        @if (nextStatuses().length) {
          <button mat-stroked-button [matMenuTriggerFor]="statusMenu" class="status-btn">
            <mat-icon>edit</mat-icon> Change status
          </button>
          <mat-menu #statusMenu="matMenu">
            @for (s of nextStatuses(); track s) {
              <button mat-menu-item (click)="changeStatus(s)">
                <span class="status-badge" [class]="'status-badge status-' + s">
                  {{ formatStatus(s) }}
                </span>
              </button>
            }
          </mat-menu>
        }

        <!-- Assign -->
        <button mat-raised-button color="primary" class="assign-btn"
                (click)="assignPanelOpen.set(!assignPanelOpen())">
          <mat-icon>person_add</mat-icon>
          {{ report()!.assignments?.length ? 'Reassign' : 'Assign' }}
        </button>
      </div>
    }
  </div>

  @if (loadingReport()) {
    <div class="loading-center"><mat-spinner diameter="32"></mat-spinner></div>
  } @else if (report()) {
    <div class="detail-body">

      <!-- Left: messages thread -->
      <div class="thread-panel">
        <div class="thread-messages" #scrollArea>
          @for (msg of messages(); track msg.id) {
            <div class="msg-row" [class.is-admin]="msg.isAdminMessage">
              <snt-avatar
                [seed]="msg.reporterSession?.avatarSeed ?? msg.admin?.displayName ?? 'admin'"
                [isAdmin]="msg.isAdminMessage"
                [role]="msg.admin?.role">
              </snt-avatar>
              <div class="msg-content">
                <div class="msg-meta">
                  <span class="msg-name" [class.admin-name]="msg.isAdminMessage">
                    {{ msg.isAdminMessage ? msg.admin?.displayName : msg.reporterSession?.anonId }}
                  </span>
                  @if (msg.isAdminMessage) {
                    <span class="admin-badge">{{ formatRole(msg.admin?.role) }}</span>
                  }
                  <span class="sev-badge" [class]="'sev-badge sev-' + msg.severity">{{ msg.severity }}</span>
                  <span class="msg-time mono">{{ msg.createdAt | date:'MMM d, HH:mm' }}</span>
                </div>
                <div class="msg-text">{{ msg.content }}</div>
                @if (msg.attachments?.length) {
                  <div class="attachments">
                    @for (att of msg.attachments; track att.id) {
                      <a class="att-chip" [href]="api.getAttachmentUrl(att.id)" target="_blank">
                        <mat-icon>attach_file</mat-icon>
                        {{ att.originalName }}
                        <span class="att-size">{{ formatSize(att.sizeBytes) }}</span>
                      </a>
                    }
                  </div>
                }
              </div>
            </div>
          }
          @if (messages().length === 0) {
            <div class="empty-msgs">
              <mat-icon>chat_bubble_outline</mat-icon>
              <p>No messages yet. Reply below to start the investigation thread.</p>
            </div>
          }
          <div #anchor></div>
        </div>

        <!-- Admin reply -->
        <div class="reply-area">
          <form [formGroup]="replyForm" (ngSubmit)="sendReply()">
            <div class="reply-wrap" [class.focused]="replyFocused">
              <textarea formControlName="content" class="reply-input"
                        placeholder="Reply to reporter (visible only within Sentinel)…"
                        rows="3"
                        (keydown.control.enter)="sendReply()"
                        (focus)="replyFocused = true"
                        (blur)="replyFocused = false">
              </textarea>
              <div class="reply-footer">
                <div class="reply-meta">
                  <mat-icon>lock</mat-icon>
                  In-system only · Encrypted · Visible to reporter
                </div>
                <button mat-raised-button color="primary" type="submit"
                        [disabled]="sendingReply() || replyForm.invalid">
                  @if (sendingReply()) {
                    <mat-spinner diameter="14"></mat-spinner>
                  } @else {
                    <mat-icon>send</mat-icon>
                  }
                  Reply
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <!-- Right: case info panel -->
      <div class="info-panel">

        <!-- Assignment -->
        @if (assignPanelOpen()) {
          <div class="snt-card assign-card">
            <div class="panel-title">Assign case</div>
            <form [formGroup]="assignForm" (ngSubmit)="submitAssign()">
              <mat-form-field>
                <mat-label>Admin</mat-label>
                <mat-select formControlName="adminId">
                  @for (a of adminList(); track a.id) {
                    <mat-option [value]="a.id">{{ a.displayName }} ({{ formatRole(a.role) }})</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field style="margin-top:8px">
                <mat-label>Note (optional)</mat-label>
                <textarea matInput formControlName="note" rows="2"></textarea>
              </mat-form-field>
              <div class="assign-actions">
                <button mat-button type="button" (click)="assignPanelOpen.set(false)">Cancel</button>
                <button mat-raised-button color="primary" type="submit"
                        [disabled]="assignForm.invalid || submittingAssign()">
                  Assign
                </button>
              </div>
            </form>
          </div>
        }

        <!-- Current assignments -->
        <div class="snt-card info-card">
          <div class="panel-title"><mat-icon>people</mat-icon> Assigned to</div>
          @if (report()!.assignments?.length === 0) {
            <div class="info-empty">Unassigned</div>
          }
          @for (a of report()!.assignments; track a.admin.displayName) {
            <div class="assignee-row">
              <div class="assignee-avatar">{{ a.admin.displayName[0] }}</div>
              <div>
                <div class="assignee-name">{{ a.admin.displayName }}</div>
                <div class="assignee-role">{{ formatRole(a.admin.role) }}</div>
              </div>
            </div>
          }
        </div>

        <!-- Case metadata -->
        <div class="snt-card info-card">
          <div class="panel-title"><mat-icon>info_outline</mat-icon> Case details</div>
          <div class="meta-grid">
            <div class="meta-label">Case #</div>
            <div class="meta-val mono">{{ report()!.caseNumber }}</div>
            <div class="meta-label">Channel</div>
            <div class="meta-val">{{ report()!.channel.displayName }}</div>
            <div class="meta-label">Severity</div>
            <div class="meta-val">
              <span class="sev-badge" [class]="'sev-badge sev-' + report()!.severity">
                {{ report()!.severity }}
              </span>
            </div>
            <div class="meta-label">Status</div>
            <div class="meta-val">
              <span class="status-badge" [class]="'status-badge status-' + report()!.status">
                {{ formatStatus(report()!.status) }}
              </span>
            </div>
            <div class="meta-label">Opened</div>
            <div class="meta-val mono">{{ report()!.createdAt | date:'MMM d, yyyy' }}</div>
            <div class="meta-label">Updated</div>
            <div class="meta-val mono">{{ report()!.updatedAt | date:'MMM d, HH:mm' }}</div>
            <div class="meta-label">Messages</div>
            <div class="meta-val mono">{{ report()!._count.messages }}</div>
          </div>
        </div>
      </div>
    </div>
  }
</div>
  `,
  styles: [`
    .detail-shell { display: flex; flex-direction: column; height: 100%; overflow: hidden; }

    /* Header */
    .detail-header {
      display: flex; align-items: center; gap: 16px;
      padding: 12px 20px;
      background: var(--navy-800); border-bottom: 1px solid var(--navy-600);
      flex-shrink: 0; flex-wrap: wrap;
    }
    .back-link {
      display: flex; align-items: center; gap: 4px;
      color: var(--navy-400); text-decoration: none; font-size: 13px;
      flex-shrink: 0;
      mat-icon { font-size: 18px; }
      &:hover { color: var(--navy-200); }
    }
    .header-main { flex: 1; min-width: 0; }
    .case-id-wrap { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px; }
    .case-num { font-family: var(--font-mono); font-size: 15px; font-weight: 500; }
    .header-sub { font-size: 12px; color: var(--navy-500); }
    .header-actions { display: flex; gap: 8px; align-items: center; flex-shrink: 0; }
    .status-btn, .assign-btn { height: 34px; font-size: 13px; }

    .loading-center { display: flex; justify-content: center; padding: 60px; }

    /* Body */
    .detail-body {
      flex: 1; display: flex; overflow: hidden;
      @media (max-width: 900px) { flex-direction: column; }
    }

    /* Thread panel */
    .thread-panel {
      flex: 1; display: flex; flex-direction: column;
      min-width: 0; border-right: 1px solid var(--navy-600);
      @media (max-width: 900px) { border-right: none; border-bottom: 1px solid var(--navy-600); }
    }
    .thread-messages {
      flex: 1; overflow-y: auto;
      padding: 16px; display: flex; flex-direction: column; gap: 4px;
    }
    .empty-msgs {
      flex: 1; display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 10px; padding: 40px; color: var(--navy-600);
      mat-icon { font-size: 36px; } p { font-size: 13px; text-align: center; }
    }
    .msg-row {
      display: flex; gap: 10px; padding: 7px 6px; border-radius: 8px;
      transition: background .1s;
      &:hover { background: rgba(255,255,255,.02); }
      &.is-admin { background: rgba(59,125,232,.03); }
    }
    .msg-content { flex: 1; min-width: 0; }
    .msg-meta {
      display: flex; align-items: center; gap: 7px; flex-wrap: wrap; margin-bottom: 4px;
    }
    .msg-name   { font-family: var(--font-mono); font-size: 12px; font-weight: 500; color: var(--navy-300); }
    .admin-name { color: var(--accent); }
    .admin-badge {
      font-size: 9px; font-family: var(--font-mono);
      background: rgba(59,125,232,.1); color: var(--accent);
      border: 1px solid rgba(59,125,232,.2); border-radius: 3px; padding: 1px 5px;
    }
    .msg-time   { font-size: 10px; color: var(--navy-600); margin-left: auto; }
    .msg-text   { font-size: 13px; color: var(--navy-100); line-height: 1.65; white-space: pre-wrap; word-break: break-word; }
    .attachments { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .att-chip {
      display: flex; align-items: center; gap: 5px;
      background: var(--navy-700); border: 1px solid var(--navy-600);
      border-radius: 6px; padding: 4px 9px; text-decoration: none;
      color: var(--navy-200); font-size: 12px;
      mat-icon { font-size: 13px; color: var(--accent); }
      .att-size { color: var(--navy-500); font-family: var(--font-mono); font-size: 11px; }
      &:hover { border-color: var(--accent); }
    }

    /* Reply */
    .reply-area {
      padding: 12px 16px 16px;
      background: var(--navy-800); border-top: 1px solid var(--navy-600);
      flex-shrink: 0;
    }
    .reply-wrap {
      background: var(--navy-700); border: 1px solid var(--navy-600);
      border-radius: 10px; overflow: hidden;
      &.focused { border-color: var(--navy-500); }
    }
    .reply-input {
      width: 100%; background: transparent; border: none; padding: 10px 12px;
      color: var(--navy-50); font-family: var(--font-sans); font-size: 13px;
      line-height: 1.6; resize: none; outline: none; min-height: 64px;
      &::placeholder { color: var(--navy-500); }
    }
    .reply-footer {
      display: flex; align-items: center; justify-content: space-between;
      padding: 7px 10px; border-top: 1px solid var(--navy-600);
    }
    .reply-meta {
      display: flex; align-items: center; gap: 5px;
      font-size: 11px; color: var(--navy-500); font-family: var(--font-mono);
      mat-icon { font-size: 12px; color: var(--teal); }
      @media (max-width: 480px) { display: none; }
    }

    /* Info panel */
    .info-panel {
      width: 300px; overflow-y: auto; padding: 16px;
      display: flex; flex-direction: column; gap: 14px;
      flex-shrink: 0;
      @media (max-width: 900px) { width: 100%; max-height: 360px; }
    }
    .assign-card { }
    .panel-title {
      display: flex; align-items: center; gap: 6px;
      font-size: 12px; font-weight: 500; color: var(--navy-400);
      text-transform: uppercase; letter-spacing: .07em;
      margin-bottom: 12px;
      mat-icon { font-size: 14px; }
    }
    .assign-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
    .info-empty { font-size: 13px; color: var(--navy-600); }
    .assignee-row {
      display: flex; align-items: center; gap: 10px; margin-bottom: 8px;
    }
    .assignee-avatar {
      width: 30px; height: 30px; border-radius: 8px;
      background: rgba(59,125,232,.15); color: var(--accent);
      display: flex; align-items: center; justify-content: center;
      font-family: var(--font-mono); font-size: 13px; flex-shrink: 0;
    }
    .assignee-name { font-size: 13px; color: var(--navy-100); font-weight: 500; }
    .assignee-role { font-size: 11px; color: var(--navy-500); font-family: var(--font-mono); }

    .meta-grid {
      display: grid; grid-template-columns: auto 1fr; gap: 6px 12px; align-items: center;
    }
    .meta-label { font-size: 11px; color: var(--navy-500); white-space: nowrap; }
    .meta-val   { font-size: 12px; color: var(--navy-200); }
    .mono { font-family: var(--font-mono); }
  `],
})
export class CaseDetailComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('scrollArea') scrollArea!: ElementRef;
  @ViewChild('anchor')     anchor!:     ElementRef;

  report       = signal<Report | null>(null);
  messages     = signal<Message[]>([]);
  adminList    = signal<any[]>([]);
  loadingReport= signal(true);
  sendingReply = signal(false);
  submittingAssign = signal(false);
  assignPanelOpen  = signal(false);
  replyFocused     = false;
  private shouldScroll = true;
  private wsSub?: Subscription;
  private reportId = '';

  replyForm = this.fb.group({ content: ['', [Validators.required, Validators.minLength(1)]] });
  assignForm= this.fb.group({ adminId: ['', Validators.required], note: [''] });

  nextStatuses = signal<CaseStatus[]>([]);
  myAdminId = () => (this.auth.profile() as AdminProfile | null)?.id ?? '';

  constructor(
    private route:  ActivatedRoute,
    public  api:    ApiService,
    private ws:     WebSocketService,
    private auth:   AuthService,
    private fb:     FormBuilder,
    private snack:  MatSnackBar,
  ) {}

  ngOnInit() {
    this.route.params.subscribe(({ id }) => {
      this.reportId = id;
      this.loadReport(id);
      this.loadMessages(id);
      this.subscribeWs(id);
    });
  }

  private loadReport(id: string) {
    this.api.getReport(id).subscribe({
      next: ({ report, admins }) => {
        this.report.set(report);
        this.adminList.set(admins ?? []);
        this.nextStatuses.set(STATUS_TRANSITIONS[report.status as CaseStatus] ?? []);
        this.loadingReport.set(false);
      },
      error: () => this.loadingReport.set(false),
    });
  }

  private loadMessages(id: string) {
    this.api.getReportMessages(id).subscribe({
      next: ({ messages }) => {
        this.messages.set(messages);
        this.shouldScroll = true;
      },
    });
  }

  private subscribeWs(reportId: string) {
    const conn = this.ws.connect();
    this.ws.subscribe(reportId);
    this.wsSub = conn.subscribe(msg => {
      if (msg.type === 'NEW_MESSAGE' && msg['message']?.reportId === reportId) {
        this.messages.update(prev => [...prev, msg['message']]);
        this.shouldScroll = true;
      }
      if (msg.type === 'STATUS_CHANGED' && msg['reportId'] === reportId) {
        const newStatus = msg['status'] as CaseStatus;
        this.report.update(r => r ? { ...r, status: newStatus } : r);
        this.nextStatuses.set(STATUS_TRANSITIONS[newStatus] ?? []);
      }
    });
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.anchor?.nativeElement?.scrollIntoView({ behavior: 'smooth' });
      this.shouldScroll = false;
    }
  }

  changeStatus(status: CaseStatus) {
    this.api.updateReportStatus(this.reportId, status).subscribe({
      next: ({ report }) => {
        this.report.set(report);
        this.nextStatuses.set(STATUS_TRANSITIONS[status] ?? []);
        this.snack.open(`Status updated to ${this.formatStatus(status)}`, 'OK',
          { panelClass: 'snack-success' });
      },
      error: () => this.snack.open('Failed to update status', 'Dismiss', { panelClass: 'snack-error' }),
    });
  }

  sendReply() {
    const content = this.replyForm.value.content?.trim();
    if (!content || this.sendingReply()) return;
    this.sendingReply.set(true);

    // Admin replies go to the report's channel with the reportId attached
    const channelId = this.report()?.channel?.slug ?? '';
    this.api.sendMessage(channelId, content, 'INFO', this.reportId).subscribe({
      next: () => { this.replyForm.reset(); this.sendingReply.set(false); },
      error: () => {
        this.sendingReply.set(false);
        this.snack.open('Failed to send reply', 'Dismiss', { panelClass: 'snack-error' });
      },
    });
  }

  submitAssign() {
    if (this.assignForm.invalid) return;
    this.submittingAssign.set(true);
    const { adminId, note } = this.assignForm.value;

    this.api.assignReport(this.reportId, adminId!, note ?? undefined).subscribe({
      next: ({ report }) => {
        this.report.set(report);
        this.submittingAssign.set(false);
        this.assignPanelOpen.set(false);
        this.assignForm.reset();
        this.snack.open('Case assigned successfully', 'OK', { panelClass: 'snack-success' });
      },
      error: () => {
        this.submittingAssign.set(false);
        this.snack.open('Assignment failed', 'Dismiss', { panelClass: 'snack-error' });
      },
    });
  }

  formatStatus(s: string) {
    return s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }
  formatRole(r?: string) { return r?.replace(/_/g, ' ') ?? ''; }
  formatSize(bytes: number) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  ngOnDestroy() {
    this.ws.unsubscribe(this.reportId);
    this.wsSub?.unsubscribe();
  }
}