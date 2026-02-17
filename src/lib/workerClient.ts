import { dispatchImageProgress } from './imageProcessor/events';

// Interface for the proxy pipeline
export type PipelineProxy = (imageBlob: Blob) => Promise<Blob>;

let worker: Worker | null = null;
let resolveRmbgInit: ((value: PipelineProxy) => void) | null = null;
let rejectInit: ((reason?: Error) => void) | null = null;

// Map to store pending requests
// For RMBG, we use 'id' as key. For Upscaler, we might need a request ID or reuse modelId if single request.
// Let's use a unique requestId for generic processing
let requestCounter = 0;
const pendingProcess = new Map<string, { resolve: (b: Blob) => void, reject: (err: Error) => void }>();

export const getWorker = () => {
    if (!worker) {
        worker = new Worker(new URL('./workers/ai.worker.ts', import.meta.url), { type: 'module' });
        
        worker.onmessage = (e) => {
            const { type, id, requestId, mask, image, error, percent, file } = e.data;

            if (type === 'rmbg_ready') {
                if (resolveRmbgInit) resolveRmbgInit(createRmbgProxy(id));
            } else if (type === 'upscaler_ready') {
                // When upscaler is ready, we resolve the specific promise for that model init if we had one?
                // Actually upscaler might be init per model. 
                // For simplicity, let's just dispatch readiness or handle specific init calls.
                // Our current useAIEnhance just needs to know it's ready.
            } else if (type === 'progress') {
                if (percent && id) {
                    dispatchImageProgress(id, `loading:${file || 'model'}`, percent.toString(), 'loading');
                }
            } else if (type === 'upscaler_progress') {
                // Handle upscaler progress generic
            } else if (type === 'rmbg_complete') {
                const p = pendingProcess.get(id); // For RMBG we partially used 'id' as key in previous code, but let's standardize
                if (p) {
                    p.resolve(mask);
                    pendingProcess.delete(id);
                }
            } else if (type === 'upscaler_complete' || type === 'inpaint_complete') {
                 const p = pendingProcess.get(requestId);
                 if (p) {
                     p.resolve(image);
                     pendingProcess.delete(requestId);
                 }
            } else if (type === 'error') {
                 // Try to find who to reject
                 if (id && pendingProcess.has(id)) {
                     pendingProcess.get(id)?.reject(error);
                     pendingProcess.delete(id);
                 } else if (requestId && pendingProcess.has(requestId)) {
                     pendingProcess.get(requestId)?.reject(error);
                     pendingProcess.delete(requestId);
                 } else if (rejectInit) {
                     rejectInit(error);
                 }
                 console.error('[Worker Error]', error);
            }
        };
    }
    return worker;
};

// Proxy for RMBG (keeps existing ID-based contract)
const createRmbgProxy = (id: string): PipelineProxy => {
    return async (imageBlob: Blob) => {
        return new Promise((resolve, reject) => {
            const w = getWorker();
            // We use 'id' as the key for RMBG to match existing logic, ensuring only one op per image ID?
            // Actually, ensures we can map back the response.
            pendingProcess.set(id, { resolve, reject });
            w.postMessage({ type: 'process_rmbg', id, image: imageBlob });
        });
    };
};

// Proxy for Upscaler (uses request ID)
export const runUpscalerViaWorker = async (imageBlob: Blob, modelId: string, onProgress: (p: number) => void): Promise<Blob> => {
    const w = getWorker();
    const reqId = `upscale_${++requestCounter}`;
    
    return new Promise((resolve, reject) => {
        pendingProcess.set(reqId, { resolve, reject });
        
        // We need to handle progress specifically for this request
        w.addEventListener('message', (e) => {
            if (e.data.type === 'upscaler_progress' && !e.data.id) { 
                // Using global upscaler progress for now as we have single active upscaler usually
                onProgress(e.data.percent);
            }
        });

        w.postMessage({ type: 'process_upscaler', image: imageBlob, modelId, requestId: reqId });
    });
};

export const initRmbgWorker = async (id: string, modelId?: string): Promise<PipelineProxy> => {
    const w = getWorker();
    return new Promise((resolve, reject) => {
        resolveRmbgInit = resolve;
        rejectInit = reject;
        w.postMessage({ type: 'init_rmbg', id, modelId });
    });
};

export const runInpaintViaWorker = async (imageBlob: Blob, maskBlob: Blob, onProgress: (p: number) => void): Promise<Blob> => {
    const w = getWorker();
    const reqId = `inpaint_${++requestCounter}`;
    
    return new Promise((resolve, reject) => {
        pendingProcess.set(reqId, { resolve, reject });
        
        // Progress listener
        const progressHandler = (e: MessageEvent) => {
            if (e.data.requestId === reqId && e.data.type === 'inpaint_progress') {
                onProgress(e.data.percent);
            }
        };
        w.addEventListener('message', progressHandler);
        
        // Cleanup listener on completion (hacky but works alongside global resolver)
        const cleanup = () => w.removeEventListener('message', progressHandler);
        
        // We wrap the map entry to invoke cleanup
        // But since we already set it in pendingProcess, we'd need to intercept logic in onmessage.
        // Or simpler: just leak the listener for the session (listeners are cheapish), OR better:
        // Add a 'cleanup' callback to the pending map value
        
        // Let's modify the map value type implicitly or just use a timeout cleanup if we care.
        // Better yet, extend the global onmessage to handle inpaint_progress dispatching if request ID matches? 
        // But global onmessage doesn't have the user's onProgress callback context.
        // So local listener is needed.
        // Let's attach cleanup to the promise resolution wrapper.
        
        const originalResolve = resolve;
        const originalReject = reject;
        
        pendingProcess.set(reqId, {
            resolve: (b) => { cleanup(); originalResolve(b); },
            reject: (e) => { cleanup(); originalReject(e); }
        });
        
        w.postMessage({ type: 'process_inpaint', image: imageBlob, mask: maskBlob, requestId: reqId });
    });
};

