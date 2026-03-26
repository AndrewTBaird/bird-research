import { open } from 'lmdb';

export const db = open({ path: process.env['DB_PATH'] ?? './data' });

export type JobStatus = 'queued' | 'processing' | 'done' | 'failed';

export type Job = {
  name: string;
  status: JobStatus;
  createdAt: string;
};

export type BirdResult = {
  name: string;
  summary: string;
};

export function jobKey(name: string) {
  return `job:${name}`;
}

export function birdKey(name: string) {
  return `bird:${name}`;
}

export const queueKey = "queue:pending"

