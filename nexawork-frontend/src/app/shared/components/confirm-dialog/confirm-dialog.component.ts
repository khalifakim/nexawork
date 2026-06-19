import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  template: `
    @if (visible) {
      <div class="modal d-block" tabindex="-1" style="background:rgba(0,0,0,0.5)">
        <div class="modal-dialog modal-sm modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h6 class="modal-title">{{ title }}</h6>
            </div>
            <div class="modal-body">
              <p class="mb-0">{{ message }}</p>
            </div>
            <div class="modal-footer py-2">
              <button class="btn btn-sm btn-outline-secondary" (click)="cancel.emit()">Annuler</button>
              <button class="btn btn-sm btn-danger" (click)="confirm.emit()">{{ confirmLabel }}</button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmDialogComponent {
  @Input() visible = false;
  @Input() title = 'Confirmation';
  @Input() message = 'Êtes-vous sûr ?';
  @Input() confirmLabel = 'Confirmer';
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
