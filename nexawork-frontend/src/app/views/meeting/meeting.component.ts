import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { MeetingService } from '@core/services/meeting.service';
import { Call } from '@core/models/meeting.models';

@Component({
  selector: 'app-meeting',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h4 class="mb-0">Réunions</h4>
      <button class="btn btn-primary btn-sm" (click)="showCreate = !showCreate">
        + Planifier un appel
      </button>
    </div>

    @if (showCreate) {
      <div class="card mb-4">
        <div class="card-body">
          <h6>Nouvel appel</h6>
          <input [(ngModel)]="newTopic" class="form-control mb-2" placeholder="Sujet de la réunion" />
          <button class="btn btn-success btn-sm me-2" (click)="createCall()">Créer</button>
          <button class="btn btn-secondary btn-sm" (click)="showCreate = false">Annuler</button>
        </div>
      </div>
    }

    <div class="row g-3">
      @for (call of calls(); track call.id) {
        <div class="col-md-4">
          <div class="card shadow-sm">
            <div class="card-body">
              <h6>{{ call.topic }}</h6>
              <p class="text-muted mb-1">Statut : <span class="badge bg-info">{{ call.status }}</span></p>
              @if (call.scheduledAt) {
                <p class="text-muted mb-2">{{ call.scheduledAt | date:'dd/MM/yyyy HH:mm' }}</p>
              }
              @if (call.status !== 'ENDED') {
                <button class="btn btn-sm btn-primary w-100" (click)="joinCall(call)">
                  Rejoindre
                </button>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class MeetingComponent implements OnInit {
  private readonly meetingService = inject(MeetingService);

  calls = signal<Call[]>([]);
  showCreate = false;
  newTopic = '';

  ngOnInit(): void {
    this.loadCalls();
  }

  loadCalls(): void {
    this.meetingService.getCalls().subscribe(res => this.calls.set(res.data));
  }

  createCall(): void {
    if (!this.newTopic.trim()) return;
    this.meetingService.createCall({ topic: this.newTopic }).subscribe(() => {
      this.newTopic = '';
      this.showCreate = false;
      this.loadCalls();
    });
  }

  joinCall(call: Call): void {
    this.meetingService.joinCall(call.id).subscribe(res => {
      if (res.data.jitsiUrl) {
        window.open(res.data.jitsiUrl, '_blank');
      }
    });
  }
}
