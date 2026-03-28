'use server';

import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import type { VirtualFileSystemData } from '@/lib/file-system';

export async function createProject(name: string = 'Untitled Project') {
  const session = await getSession();
  const project = await prisma.project.create({
    data: {
      name,
      userId: session?.userId ?? null,
      messages: '[]',
      data: '{}',
    },
  });
  return project;
}

export async function getProject(id: string) {
  const project = await prisma.project.findUnique({
    where: { id },
  });
  return project;
}

export async function updateProject(
  id: string,
  data: {
    name?: string;
    messages?: string;
    data?: string;
  }
) {
  const project = await prisma.project.update({
    where: { id },
    data,
  });
  return project;
}

export async function getUserProjects() {
  const session = await getSession();
  if (!session) return [];

  const projects = await prisma.project.findMany({
    where: { userId: session.userId },
    orderBy: { updatedAt: 'desc' },
  });
  return projects;
}

export async function deleteProject(id: string) {
  const session = await getSession();
  const project = await prisma.project.findUnique({ where: { id } });

  if (!project) return { error: 'Project not found' };

  // Only allow deletion if user owns the project or it's anonymous
  if (project.userId && project.userId !== session?.userId) {
    return { error: 'Unauthorized' };
  }

  await prisma.project.delete({ where: { id } });
  return { success: true };
}

export async function claimAnonProject(projectId: string) {
  const session = await getSession();
  if (!session) return { error: 'Not authenticated' };

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return { error: 'Project not found' };
  if (project.userId) return { error: 'Project already claimed' };

  await prisma.project.update({
    where: { id: projectId },
    data: { userId: session.userId },
  });

  return { success: true };
}
