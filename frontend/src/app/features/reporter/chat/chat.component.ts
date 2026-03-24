import {
  Component, OnInit, OnDestroy, signal, computed,
  ViewChild, ElementRef, AfterViewChecked, Input,
} from '@angular/core';
import { CommonModule }   from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule }  from '@angular/material/icon';
import { MatButtonModule }from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule }  from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar }    from '@angular/material/snack-bar';
import { Subscription }   from 'rxjs';
import { ApiService }     from '../../../core/services/api.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { AuthService, ReporterProfile } from '../../../core/services/auth.service';
import { Message, Channel, Severity } from '../../../core/models/report.model';
import { AvatarComponent } from '../../shared/avatar/avatar.component';

@Component({
  selector:   'snt-chat',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatIconModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatMenuModule, MatProgressSpinnerModule,
    AvatarComponent,
  ],
  template: `
<div class="chat-shell">

  <!-- Header -->
  <div class="chat-header">
    <a class="back-btn" routerLink="/reporter/channels">
      <mat-icon>arrow_back</mat-icon>
    </a>
    <div class="header-info">
      <div class="header-title"># {{ channel()?.displayName ?? 'Loading…' }}</div>
      <div class="header-sub">{{ channel()?.description }}</div>
    </div>
    <div class="header-badges">
      <div class="badge-anon"><mat-icon>lock</mat-icon>ANON</div>
      <div class="badge-enc"><mat-icon>enhanced_encryption</mat-icon>E2E</div>
    </div>
  </div>

  <!-- Messages -->
  <div class="messages-area" #scrollArea>

    @if (loadingMsgs()) {
      <div class="loading-center"><mat-spinner diameter="28"></mat-spinner></div>
    }

    @if (hasMore() && !loadingMsgs()) {
      <button class="load-more-btn" (click)="loadMore()">Load earlier messages</button>
    }

    @for (msg of messages(); track msg.id) {
      <div class="msg-row" [class.is-admin]="msg.isAdminMessage">

        <!-- Avatar -->
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
            <span class="msg-sev sev-badge" [class]="'sev-badge sev-' + msg.severity">
              {{ msg.severity }}
            </span>
            <span class="msg-time">{{ msg.createdAt | date:'HH:mm' }}</span>
          </div>

          <div class="msg-text">{{ msg.content }}</div>

          @if (msg.attachments?.length) {
            <div class="attachments">
              @for (att of msg.attachments; track att.id) {
                <a class="attachment-chip" [href]="api.getAttachmentUrl(att.id)" target="_blank">
                  <mat-icon>attach_file</mat-icon>
                  <span>{{ att.originalName }}</span>
                  <span class="att-size">{{ formatSize(att.sizeBytes) }}</span>
                </a>
              }
            </div>
          }
        </div>
      </div>
    }

    @if (!loadingMsgs() && messages().length === 0) {
      <div class="empty-state">
        <mat-icon>chat_bubble_outline</mat-icon>
        <p>No messages yet. Send your first report below.</p>
      </div>
    }
    <div #anchor></div>
  </div>

  <!-- Input area -->
  <div class="input-area">
    <div class="input-toolbar">
      <!-- Severity selector -->
      <button mat-button [matMenuTriggerFor]="sevMenu" class="sev-btn">
        <span class="sev-badge" [class]="'sev-badge sev-' + selectedSev()">{{ selectedSev() }}</span>
        <mat-icon>expand_more</mat-icon>
      </button>
      <mat-menu #sevMenu="matMenu">
        @for (s of severities; track s) {
          <button mat-menu-item (click)="selectedSev.set(s)">
            <span class="sev-badge" [class]="'sev-badge sev-' + s">{{ s }}</span>
          </button>
        }
      </mat-menu>

      <!-- File attach -->
      <button mat-icon-button (click)="fileInput.click()" matTooltip="Attach evidence">
        <mat-icon>attach_file</mat-icon>
      </button>
      <input #fileInput type="file" hidden (change)="onFileSelect($event)"
             accept=".pdf,.jpg,.jpeg,.png,.mp4,.mp3,.doc,.docx">

      @if (attachedFile()) {
        <div class="attached-badge">
          <mat-icon>description</mat-icon>
          {{ attachedFile()!.name }}
          <button mat-icon-button (click)="attachedFile.set(null)">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      }
    </div>

    <form [formGroup]="msgForm" (ngSubmit)="sendMessage()">
      <div class="input-wrap" [class.focused]="inputFocused">
        <textarea
          formControlName="content"
          class="msg-input"
          placeholder="Describe the incident confidentially…"
          rows="3"
          (keydown.control.enter)="sendMessage()"
          (keydown.meta.enter)="sendMessage()"
          (focus)="inputFocused = true"
          (blur)="inputFocused = false"
          (input)="autoResize($event)">
        </textarea>
        <div class="input-footer">
          <span class="input-hint">
            <mat-icon>lock</mat-icon>
            Sending as <strong>{{ myAnonId() }}</strong> · Encrypted · In-system only
          </span>
          <button mat-raised-button color="primary" type="submit"
                  class="send-btn"
                  [disabled]="sending() || msgForm.invalid">
            @if (sending()) {
              <mat-spinner diameter="16"></mat-spinner>
            } @else {
              <mat-icon>send</mat-icon>
            }
            Send
          </button>
        </div>
      </div>
    </form>
  </div>
</div>
  `,
  styles: [`
    .chat-shell {
      display: flex; flex-direction: column;
      height: 100%; overflow: hidden;
    }

    /* Header */
    .chat-header {
      display: flex; align-items: center; gap: 12px;
      padding: 0 16px; height: 52px;
      background: var(--navy-800);
      border-bottom: 1px solid var(--navy-600);
      flex-shrink: 0;
    }
    .back-btn {
      display: none; color: var(--navy-300); text-decoration: none;
      align-items: center;
      mat-icon { font-size: 20px; }
      @media (max-width: 768px) { display: flex; }
    }
    .header-info { flex: 1; min-width: 0; }
    .header-title { font-size: 14px; font-weight: 500; color: var(--navy-50); }
    .header-sub   { font-size: 11px; color: var(--navy-400); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .header-badges { display: flex; gap: 6px; }
    .badge-anon, .badge-enc {
      display: flex; align-items: center; gap: 4px;
      font-size: 10px; font-family: var(--font-mono);
      padding: 2px 7px; border-radius: 4px; letter-spacing: .05em;
      mat-icon { font-size: 11px; width: 11px; height: 11px; }
    }
    .badge-anon { background: rgba(59,125,232,.1); color: var(--accent); border: 1px solid rgba(59,125,232,.2); }
    .badge-enc  { background: rgba(30,184,160,.08); color: var(--teal);  border: 1px solid rgba(30,184,160,.18); }

    /* Messages */
    .messages-area {
      flex: 1; overflow-y: auto; padding: 16px;
      display: flex; flex-direction: column; gap: 4px;
    }
    .loading-center { display: flex; justify-content: center; padding: 24px 0; }
    .load-more-btn {
      align-self: center; margin: 8px 0;
      background: transparent; border: 1px solid var(--navy-600);
      border-radius: 20px; padding: 5px 16px;
      color: var(--navy-400); font-size: 12px; cursor: pointer;
      &:hover { border-color: var(--navy-500); color: var(--navy-200); }
    }

    .msg-row {
      display: flex; gap: 10px; padding: 6px 4px;
      border-radius: 8px; transition: background .1s;
      &:hover { background: rgba(255,255,255,.02); }
      &.is-admin { background: rgba(59,125,232,.03); border-radius: 8px; }
    }
    .msg-content { flex: 1; min-width: 0; }
    .msg-meta {
      display: flex; align-items: center; gap: 7px;
      flex-wrap: wrap; margin-bottom: 4px;
    }
    .msg-name    { font-family: var(--font-mono); font-size: 12px; font-weight: 500; color: var(--navy-300); }
    .admin-name  { color: var(--accent); }
    .admin-badge {
      font-size: 9px; font-family: var(--font-mono);
      background: rgba(59,125,232,.1); color: var(--accent);
      border: 1px solid rgba(59,125,232,.2); border-radius: 3px;
      padding: 1px 5px; letter-spacing: .05em;
    }
    .msg-time    { font-size: 10px; color: var(--navy-600); font-family: var(--font-mono); margin-left: auto; }
    .msg-text    { font-size: 13px; color: var(--navy-100); line-height: 1.65; white-space: pre-wrap; word-break: break-word; }

    .attachments { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .attachment-chip {
      display: flex; align-items: center; gap: 5px;
      background: var(--navy-700); border: 1px solid var(--navy-600);
      border-radius: 6px; padding: 5px 9px;
      text-decoration: none; color: var(--navy-200); font-size: 12px;
      mat-icon { font-size: 14px; width: 14px; height: 14px; color: var(--accent); }
      .att-size { color: var(--navy-500); font-family: var(--font-mono); font-size: 11px; }
      &:hover { border-color: var(--accent); }
    }

    .empty-state {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      gap: 12px; color: var(--navy-600); padding: 40px 0;
      mat-icon { font-size: 40px; width: 40px; height: 40px; }
      p { font-size: 13px; }
    }

    /* Input */
    .input-area {
      padding: 12px 16px 16px;
      background: var(--navy-800);
      border-top: 1px solid var(--navy-600);
      flex-shrink: 0;
    }
    .input-toolbar {
      display: flex; align-items: center; gap: 4px;
      margin-bottom: 8px;
    }
    .sev-btn {
      display: flex; align-items: center; gap: 4px; height: 28px;
      padding: 0 6px; font-size: 12px;
    }
    .attached-badge {
      display: flex; align-items: center; gap: 4px;
      background: rgba(59,125,232,.1); border: 1px solid rgba(59,125,232,.2);
      border-radius: 6px; padding: 2px 8px;
      font-size: 11px; color: var(--accent);
      mat-icon { font-size: 13px; }
      button { width: 20px; height: 20px; line-height: 20px; }
    }
    .input-wrap {
      background: var(--navy-700);
      border: 1px solid var(--navy-600);
      border-radius: 10px; overflow: hidden;
      transition: border-color .15s;
      &.focused { border-color: var(--navy-500); }
    }
    .msg-input {
      width: 100%; background: transparent; border: none;
      padding: 12px 14px; color: var(--navy-50);
      font-family: var(--font-sans); font-size: 13px;
      line-height: 1.6; resize: none; outline: none;
      min-height: 70px; max-height: 160px;
      &::placeholder { color: var(--navy-500); }
    }
    .input-footer {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 10px;
      border-top: 1px solid var(--navy-600);
    }
    .input-hint {
      display: flex; align-items: center; gap: 4px;
      font-size: 11px; color: var(--navy-500); font-family: var(--font-mono);
      mat-icon { font-size: 12px; color: var(--teal); }
      strong { color: var(--teal); }
      @media (max-width: 480px) { display: none; }
    }
    .send-btn {
      height: 32px; display: flex; align-items: center; gap: 5px;
      font-size: 13px;
    }
  `],
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('scrollArea') scrollArea!: ElementRef<HTMLDivElement>;
  @ViewChild('anchor')     anchor!:     ElementRef<HTMLDivElement>;

  channelId  = signal('');
  channel    = signal<Channel | null>(null);
  messages   = signal<Message[]>([]);
  loadingMsgs= signal(true);
  sending    = signal(false);
  hasMore    = signal(false);
  cursor     = signal<string | undefined>(undefined);
  attachedFile= signal<File | null>(null);
  selectedSev = signal<Severity>('INFO');
  inputFocused = false;
  private shouldScroll = true;
  private wsSub?: Subscription;

  severities: Severity[] = ['INFO', 'MEDIUM', 'HIGH', 'CRITICAL'];

  myAnonId = computed(() => (this.auth.profile() as ReporterProfile | null)?.anonId ?? 'Anon-????');

  msgForm = this.fb.group({ content: ['', [Validators.required, Validators.minLength(1)]] });

  constructor(
    private route:  ActivatedRoute,
    public  api:    ApiService,
    private ws:     WebSocketService,
    private auth:   AuthService,
    private fb:     FormBuilder,
    private snack:  MatSnackBar,
  ) {}

  ngOnInit() {
    this.route.params.subscribe(({ channelId }) => {
      this.channelId.set(channelId);
      this.loadChannel(channelId);
      this.loadMessages(channelId);
      this.subscribeWs(channelId);
    });
  }

  private loadChannel(id: string) {
    this.api.getChannels().subscribe(({ channels }) => {
      this.channel.set(channels.find((c: Channel) => c.id === id) ?? null);
    });
  }

  private loadMessages(id: string, append = false) {
    this.loadingMsgs.set(!append);
    this.api.getMessages(id, append ? this.cursor() : undefined).subscribe({
      next: ({ messages, hasMore }) => {
        if (append) {
          this.messages.update(prev => [...messages, ...prev]);
        } else {
          this.messages.set(messages);
          this.shouldScroll = true;
        }
        this.hasMore.set(hasMore);
        if (messages.length) this.cursor.set(messages[0].id);
        this.loadingMsgs.set(false);
      },
      error: () => this.loadingMsgs.set(false),
    });
  }

  private subscribeWs(channelId: string) {
    const conn = this.ws.connect();
    this.ws.subscribe(channelId);
    this.wsSub = conn.subscribe(msg => {
      if (msg.type === 'NEW_MESSAGE' && msg['message']?.channelId === channelId) {
        this.messages.update(prev => [...prev, msg['message']]);
        this.shouldScroll = true;
      }
    });
  }

  loadMore() { this.loadMessages(this.channelId(), true); }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.anchor?.nativeElement?.scrollIntoView({ behavior: 'smooth' });
      this.shouldScroll = false;
    }
  }

  sendMessage() {
    const content = this.msgForm.value.content?.trim();
    if (!content || this.sending()) return;

    this.sending.set(true);

    const sendFn = () => this.api.sendMessage(this.channelId(), content, this.selectedSev());

    sendFn().subscribe({
      next: () => {
        this.msgForm.reset();
        this.attachedFile.set(null);
        this.sending.set(false);
        this.shouldScroll = true;
      },
      error: () => {
        this.sending.set(false);
        this.snack.open('Failed to send message', 'Dismiss', { panelClass: 'snack-error' });
      },
    });
  }

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) this.attachedFile.set(input.files[0]);
  }

  autoResize(event: Event) {
    const el = event.target as HTMLTextAreaElement;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }

  formatRole(role?: string) {
    return role?.replace('_', ' ') ?? '';
  }

  formatSize(bytes: number) {
    if (bytes < 1024)        return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  ngOnDestroy() {
    this.ws.unsubscribe(this.channelId());
    this.wsSub?.unsubscribe();
  }
}