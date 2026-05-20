import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environment/environment';
import { Project, Task, WorkflowStatus, CreateProjectRequest, CreateTaskRequest } from '@core/models/project.models';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/nexawork-project-api-v1/api/v1`;

  getProjects(): Observable<{ data: Project[] }> {
    return this.http.get<{ data: Project[] }>(`${this.base}/projects`);
  }

  getProject(id: number): Observable<{ data: Project }> {
    return this.http.get<{ data: Project }>(`${this.base}/projects/${id}`);
  }

  createProject(request: CreateProjectRequest): Observable<{ data: Project }> {
    return this.http.post<{ data: Project }>(`${this.base}/projects`, request);
  }

  getWorkflow(projectId: number): Observable<{ data: WorkflowStatus[] }> {
    return this.http.get<{ data: WorkflowStatus[] }>(`${this.base}/projects/${projectId}/workflow`);
  }

  getTasks(projectId: number): Observable<{ data: Task[] }> {
    return this.http.get<{ data: Task[] }>(`${this.base}/projects/${projectId}/tasks`);
  }

  createTask(projectId: number, request: CreateTaskRequest): Observable<{ data: Task }> {
    return this.http.post<{ data: Task }>(`${this.base}/projects/${projectId}/tasks`, request);
  }

  moveTask(projectId: number, taskId: number, targetStatusId: number): Observable<{ data: Task }> {
    return this.http.patch<{ data: Task }>(
      `${this.base}/projects/${projectId}/tasks/${taskId}/move`,
      { targetStatusId }
    );
  }
}
