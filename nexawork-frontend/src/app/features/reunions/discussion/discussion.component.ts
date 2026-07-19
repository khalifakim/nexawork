import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { MeetingsService } from '@core/services/meetings.service';
import { MeetingChatService, MeetingFileResponse } from '@core/services/meeting-chat.service';
import { FilesHttpService } from '@core/http/files.http.service';
import { SessionService } from '@core/services/session.service';
import { MeetingDoc, MeetingThread } from '@core/models/meeting.models';
import { avatarColorFor } from '@core/util/ui.util';
import { ShellBus } from '@layouts/app-shell/shell.bus';

const EMPTY_THREAD: MeetingThread = { id: '', name: '', proj: '', date: '', docs: [], messages: [] };

/** Fichier partagé (M5) → tuile « Documents partagés ». */
function toMeetingDoc(f: MeetingFileResponse): MeetingDoc {
  return {
    name: f.fileName,
    meta: f.sharedByName + (f.fileSize ? ' · ' + formatSize(f.fileSize) : ''),
    color: avatarColorFor(f.fileName),
    icon: 'file',
    // Le binaire est dans MinIO : le fichier se télécharge, même des mois après.
    url: f.downloadUrl,
  };
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' o';
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' Ko';
  return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
}

@Component({
  selector: 'app-discussion-reunion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="chat">
      <div class="ch">
        <button class="back" (click)="back()"><app-icon name="chevronLeft" [size]="18" [stroke]="2.2" /></button>
        <div class="ch__tx"><div class="ch__n">{{ thread().name }}</div><div class="ch__c">Réunion · {{ thread().proj }} · {{ thread().date }}</div></div>
        <span class="ro"><app-icon name="lock" [size]="14" />Lecture seule</span>
      </div>

      <div class="docs">
        <div class="docs__l">Documents partagés · {{ thread().docs.length }}</div>
        <div class="docs__r">
          @for (d of thread().docs; track d.name) {
            <!-- Téléchargeable : le binaire est dans MinIO (M5), pas chez un tiers. -->
            <button class="doc" [disabled]="!d.url" (click)="download(d)"
                    [title]="d.url ? 'Télécharger ' + d.name : d.name">
              <span class="doc__ic" [style.color]="d.color"><app-icon [name]="d.icon" [size]="18" /></span>
              <div><div class="doc__n">{{ d.name }}</div><div class="doc__s">{{ d.meta }}</div></div>
              @if (d.url) { <span class="doc__dl"><app-icon name="download" [size]="15" /></span> }
            </button>
          }
        </div>
      </div>

      <div class="msgs">
        <div class="day"><div class="day__l"></div><span>{{ thread().date }}</span><div class="day__l"></div></div>
        @for (m of thread().messages; track $index) {
          <div class="msg"><span class="av" [style.background]="m.color">{{ ini(m.author) }}</span>
            <div class="b"><div class="h"><span class="n">{{ m.author }}</span><span class="t">{{ m.time }}</span></div><div class="x">{{ m.text }}</div></div></div>
        }
      </div>

      <div class="foot"><app-icon name="lock" [size]="15" /><span>Ce fil de discussion est en lecture seule — aucun nouveau message ne peut être ajouté.</span></div>
    </div>
  `,
  styleUrl: './discussion.component.scss',
})
export class DiscussionReunionComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private meetingsSvc = inject(MeetingsService);
  private chat = inject(MeetingChatService);
  private files = inject(FilesHttpService);
  private session = inject(SessionService);
  private bus = inject(ShellBus);

  private id = toSignal(this.route.paramMap.pipe(map(p => p.get('id') ?? 'r1')), { initialValue: 'r1' });
  thread = signal<MeetingThread>(EMPTY_THREAD);

  constructor() {
    // Le fil (M2) et les documents partagés (M5) sont persistés côté serveur, mais
    // n'étaient JAMAIS chargés : `toThread()` renvoyait `docs: []`/`messages: []` en
    // dur. La réunion s'affichait donc toujours vide, quoi qu'on y ait échangé.
    toObservable(this.id)
      .pipe(
        switchMap(id => forkJoin({
          thread: this.meetingsSvc.thread(id),
          messages: this.chat.messages(id, this.session.user()?.id).pipe(catchError(() => of([]))),
          files: this.chat.files(id).pipe(catchError(() => of([]))),
        })),
        takeUntilDestroyed(),
      )
      .subscribe(({ thread, messages, files }) => {
        const t: MeetingThread = {
          ...thread,
          docs: files.map(toMeetingDoc),
          messages: messages.map(m => ({
            author: m.authorName,
            color: avatarColorFor(m.authorName),
            time: new Date(m.sentAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            text: m.content,
          })),
        };
        this.thread.set(t);
        // Expose the currently-open meeting to the sidebar-2 so it can render
        // the nested "meeting shortcut" under « Historique discussion ».
        this.bus.openMeetingNav.set({ id: t.id, name: t.name, proj: t.proj, date: t.date });
      });
    // Clear the sidebar shortcut when the discussion view is left.
    inject(DestroyRef).onDestroy(() => this.bus.openMeetingNav.set(null));
  }

  ini(n: string): string { return n.split(/\s+/).map(w => w[0]).join('').slice(0, 2); }
  back(): void { this.router.navigate(['/app/reunions/historique']); }

  /**
   * Télécharge un fichier partagé. Le passage par un blob est nécessaire : l'URL
   * du File Service exige le jeton d'authentification, qu'un `<a href>` ne porte
   * pas — un lien direct renverrait 401.
   */
  download(doc: MeetingDoc): void {
    if (!doc.url) return;
    this.files.download(doc.url).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name;
      a.click();
      URL.revokeObjectURL(url);
    });
  }
}
