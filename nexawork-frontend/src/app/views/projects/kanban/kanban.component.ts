import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '@core/services/project.service';
import { Project, Task, WorkflowStatus } from '@core/models/project.models';

@Component({
  selector: 'app-kanban',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h4 class="mb-0">Projets</h4>
      <button class="btn btn-primary btn-sm" (click)="showCreateProject = true">
        + Nouveau projet
      </button>
    </div>

    @if (showCreateProject) {
      <div class="card mb-4">
        <div class="card-body">
          <h6>Créer un projet</h6>
          <input [(ngModel)]="newProjectName" class="form-control mb-2" placeholder="Nom du projet" />
          <button class="btn btn-success btn-sm me-2" (click)="createProject()">Créer</button>
          <button class="btn btn-secondary btn-sm" (click)="showCreateProject = false">Annuler</button>
        </div>
      </div>
    }

    <div class="row g-3 mb-4">
      @for (project of projects(); track project.id) {
        <div class="col-md-4">
          <div class="card shadow-sm" [class.border-primary]="selectedProject()?.id === project.id">
            <div class="card-body">
              <h6 class="card-title">{{ project.name }}</h6>
              <span class="badge bg-success">{{ project.status }}</span>
              <button class="btn btn-sm btn-outline-primary mt-2 w-100"
                (click)="selectProject(project)">
                Voir le Kanban
              </button>
            </div>
          </div>
        </div>
      }
    </div>

    @if (selectedProject()) {
      <h5>Kanban — {{ selectedProject()!.name }}</h5>
      <div class="d-flex gap-3 overflow-auto pb-2">
        @for (status of workflow(); track status.id) {
          <div class="flex-shrink-0" style="min-width:250px">
            <div class="card">
              <div class="card-header bg-secondary text-white fw-bold">{{ status.name }}</div>
              <div class="card-body p-2">
                @for (task of tasksByStatus(status.id); track task.id) {
                  <div class="card mb-2 shadow-sm">
                    <div class="card-body p-2">
                      <p class="mb-1 fw-semibold">{{ task.title }}</p>
                      <span class="badge bg-warning text-dark">{{ task.priority }}</span>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class KanbanComponent implements OnInit {
  private readonly projectService = inject(ProjectService);

  projects = signal<Project[]>([]);
  selectedProject = signal<Project | null>(null);
  workflow = signal<WorkflowStatus[]>([]);
  tasks = signal<Task[]>([]);

  showCreateProject = false;
  newProjectName = '';

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe(res => this.projects.set(res.data));
  }

  selectProject(project: Project): void {
    this.selectedProject.set(project);
    this.projectService.getWorkflow(project.id).subscribe(res => this.workflow.set(res.data));
    this.projectService.getTasks(project.id).subscribe(res => this.tasks.set(res.data));
  }

  createProject(): void {
    if (!this.newProjectName.trim()) return;
    this.projectService.createProject({ name: this.newProjectName }).subscribe(() => {
      this.newProjectName = '';
      this.showCreateProject = false;
      this.loadProjects();
    });
  }

  tasksByStatus(statusId: number): Task[] {
    return this.tasks().filter(t => t.statusId === statusId);
  }
}
