import { initRmbgWorker, type PipelineProxy } from '../workerClient';

export const getRMBGPipeline = async (id: string, modelId?: string): Promise<PipelineProxy> => {
    return initRmbgWorker(id, modelId);
};
