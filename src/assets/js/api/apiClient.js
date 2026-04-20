const API_Config = {
    // Lee la URL base desde el .env correspondiente (development o production)
    // En desarrollo:  VITE_API_URL=http://localhost:8080/api/public
    // En producción:  VITE_API_URL=https://dominio.com/vhealth/api/public
    baseURL: import.meta.env.VITE_API_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
};

class ApiClient {
    constructor(config = {}){
        this.config = {...API_Config, ...config};
        this.authToken = null;
    }

    setAuthToken(token){
        this.authToken = token;
    }

    getHeaders(){
        const headers = { ...this.config.headers };
        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        return headers;
    }

    async request(endpoint, method = 'GET', data = null, customConfig = {}){
        const url = `${this.config.baseURL}/${endpoint}`;
        const config = {
            method,
            ...customConfig,
            headers: this.getHeaders()
        };

        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            config.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, config);
            const responseBody = await response.text();

            if (!response.ok){
                try {
                    const errorData = JSON.parse(responseBody);
                    throw {
                        status: response.status,
                        statusText: response.statusText,
                        data: errorData
                    };
                } catch (jsonError) {
                    throw {
                        status: response.status,
                        statusText: response.statusText,
                        data: { message: 'Invalid JSON response' },
                        rawResponse: responseBody
                    };
                }
            }

            if (response.status === 204) return;

            try {
                return JSON.parse(responseBody);
            } catch (jsonError) {
                throw {
                    message: 'Failed to parse JSON response',
                    error: jsonError,
                    rawResponse: responseBody
                };
            }
        } catch (error) {
            this._handleError(error);
            throw error;
        }
    }

    async get(endpoint, params = {}, config = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        return this.request(url, 'GET', null, config);
    }

    async post(endpoint, data, config = {}) {
        return this.request(endpoint, 'POST', data, config);
    }

    async patch(endpoint, data, config = {}) {
        return this.request(endpoint, 'PATCH', data, config);
    }

    async put(endpoint, data, config = {}) {
        return this.request(endpoint, 'PUT', data, config);
    }

    async delete(endpoint, config = {}) {
        return this.request(endpoint, 'DELETE', null, config);
    }

    _handleError(error) {
        console.error('API Error:', error);
        if (error instanceof SyntaxError && error.message.includes('Unexpected token')) {
            console.error('Response might not be JSON. Check the server response.');
        }
        if (error.rawResponse) {
            console.error('Raw server response:', error.rawResponse);
        }
        const event = new CustomEvent('api:error', { detail: error });
        document.dispatchEvent(event);
    }
}

const apiClient = new ApiClient();
export default apiClient;
export { ApiClient };