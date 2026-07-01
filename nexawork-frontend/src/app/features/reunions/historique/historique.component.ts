import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IconComponent } from '@shared/ui/icon/icon.component';

interface Meeting { id: string; name: string; proj: string; date: string; time: string; dur: string; joined: boolean; }

@Component({
  selector: 'app-historique-reunions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="wrap">
      <div class="head">
        <h1>Historique discussion réunion</h1>
        <p>Les réunions auxquelles vous avez été invité, que vous y ayez participé ou non.</p>
      </div>
      <div class="card">
        <div class="hrow">
          <span>Réunion</span><span>Date</span><span>Durée</span><span>Participation</span><span></span>
        </div>
        @for (m of meetings; track m.id; let i = $index) {
          <div class="row" [class.row--first]="i===0" (click)="open(m.id)">
            <div class="r-name">
              <span class="r-ic"><app-icon name="video" [size]="18" /></span>
              <div><div class="r-n">{{ m.name }}</div><div class="r-p">Réunion · {{ m.proj }}</div></div>
            </div>
            <div><div class="r-d">{{ m.date }}</div><div class="r-t">{{ m.time }}</div></div>
            <span class="r-dur">{{ m.dur }}</span>
            <span>
              @if (m.joined) { <span class="tag tag--ok"><app-icon name="check" [size]="13" [stroke]="2.4" />Participé</span> }
              @else { <span class="tag tag--no"><app-icon name="x" [size]="13" [stroke]="2.4" />Absent</span> }
            </span>
            <button class="dots" (click)="$event.stopPropagation()"><app-icon name="dots" [size]="16" /></button>
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: './historique.component.scss',
})
export class HistoriqueReunionsComponent {
  private router = inject(Router);
  meetings: Meeting[] = [
    { id: 'r1', name: 'Revue sprint 12', proj: 'Refonte App Mobile', date: '9 mai 2026', time: '14:00', dur: '48 min', joined: true },
    { id: 'r2', name: 'Cadrage GED projet', proj: 'Refonte App Mobile', date: '2 mai 2026', time: '10:30', dur: '32 min', joined: true },
    { id: 'r3', name: 'Point hebdo design', proj: 'Site Vitrine 2025', date: '28 avr. 2026', time: '09:00', dur: '21 min', joined: false },
    { id: 'r4', name: 'Kickoff campagne Q3', proj: 'Campagne Q3 Marketing', date: '21 avr. 2026', time: '16:00', dur: '55 min', joined: true },
  ];
  open(id: string): void { this.router.navigate(['/app/reunions/historique', id]); }
}
