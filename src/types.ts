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
