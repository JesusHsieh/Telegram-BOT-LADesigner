import { findProject } from "../office/mockData.js";
import { getUserContext, updateUserContext } from "../office/taskStore.js";
import type { ProjectContext } from "../office/types.js";
import type { TelegramUserContext } from "../security/accessControl.js";

export function setCurrentProject(user: TelegramUserContext, projectId: string): ProjectContext | undefined {
  const project = findProject(projectId);
  if (!project) return undefined;
  updateUserContext(user.id, { current_project_id: project.project_id });
  return project;
}

export function getCurrentProject(user: TelegramUserContext): ProjectContext | undefined {
  return findProject(getUserContext(user.id).current_project_id);
}
