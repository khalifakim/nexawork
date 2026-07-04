import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap } from 'rxjs/operators';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { MeetingsService } from '@core/services/meetings.service';
import { MeetingThread } from '@core/models/meeting.models';
import { ShellBus } from '@layouts/app-shell/shell.bus';

const EMPTY_THREAD: MeetingThread = { id: '', name: '', proj: '', date: '', docs: [], messages: [] };

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
            <div class="doc"><span class="doc__ic" [style.color]="d.color"><app-icon [name]="d.icon" [size]="18" /></span>
              <div><div class="doc__n">{{ d.name }}</div><div class="doc__s">{{ d.meta }}</div></div></div>
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
  private bus = inject(ShellBus);

  private id = toSignal(this.route.paramMap.pipe(map(p => p.get('id') ?? 'r1')), { initialValue: 'r1' });
  thread = signal<MeetingThread>(EMPTY_THREAD);

  constructor() {
    toObservable(this.id)
      .pipe(switchMap(id => this.meetingsSvc.thread(id)), takeUntilDestroyed())
      .subscribe(t => {
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
}
