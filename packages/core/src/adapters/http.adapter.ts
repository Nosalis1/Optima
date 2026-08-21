
export type RequestRequiredData = Readonly<{
    method: string;
    endpoint: string;
    clientIp?: string;
}>;

export type ResponseRequiredData = Readonly<{
    statusCode: number;
}>;

export interface HttpAdapter<TRequest, TResponse> {
    getRequest(request: TRequest): RequestRequiredData;
    getResponse(response: TResponse): ResponseRequiredData;
}